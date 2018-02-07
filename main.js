/*eslint-env node, es6*/
/*eslint no-console:1*/

/* Module Description */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

//ids for modules
var welcomeModuleId = -1;
var studentResourcesId = -1;
var modulesLength = -1;

module.exports = (course, stepCallback) => {

	/* View available course object functions */
	// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

	/**********************************************
	 * makeStudentResourcesModule()
	 * Parameters: functionCallback
	 **********************************************/
	function makeStudentResourcesModule(functionCallback) {
		//create the module
		canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules`, {
				'module': {
					'name': 'Student Resources'
				}
			},
			(postErr, module) => {
				if (postErr) {
					// handle errs in the functionCallback
					functionCallback(postErr);
					return;
				} else {
					course.message(`Successfully created Student Resources module. SR ID: ${module.id}`);
					//the update module call in the canvas api requires the endpoint module id
					studentResourcesId = module.id;
					functionCallback(null);
				}
			});
	}

	/**********************************************
	 * createSRHeader()
	 * Parameters: functionCallback
	 **********************************************/
	function createSRHeader(functionCallback) {
		//create 'Standard Resources' text header
		canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${studentResourcesId}/items`, {
				'module_item': {
					'title': 'Standard Resources',
					'type': 'SubHeader'
				}
			},
			(postErr, results) => {
				if (postErr) {
					// move err handling to callback
					functionCallback(postErr);
					return;
				} else {
					course.message('Successfully created Standard Resources text header');
					functionCallback(null);
				}
			});
	}

	/**********************************************
	 * createSRHeader()
	 * Parameters: functionCallback
	 **********************************************/
	function createSupplementalHeader(functionCallback) {
		//create 'Supplemental Resources' text header
		canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${studentResourcesId}/items`, {
				'module_item': {
					'title': 'Supplemental Resources',
					'type': 'SubHeader',
					'position': 1
				}
			},
			(postErr, results) => {
				if (postErr) {
					// move err handling to callback
					functionCallback(postErr);
					return;
				} else {
					course.message('Successfully created Supplemental Resources text header');
					functionCallback(null);
				}
			});
	}

	/**********************************************
	 * deletePages()
	 * Parameters: functionCallback
	 **********************************************/
	function deletePages(functionCallback) {
		var pagesToDelete = [
			//singular 'Date' instead of 'Dates' in case of misspelling. Check using '.includes()'
			'How to Understand Due Date'
		];
		//delete "How to Understand Due Dates" if it exists
		canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items`, (getErr, moduleItems) => {
			if (getErr) {
				// move err handling to callback
				functionCallback(getErr);
				return;
			}
			course.message(`Successfully retrieved ${moduleItems.length} module items in Welcome Module`);
			asyncLib.each(moduleItems, (topic, eachCallback) => {
				//Standard Naming Scheme: How to Understand Due Dates
				if (pagesToDelete.includes(topic.title)) {
					canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items/${topic.id}`, (deleteErr, results) => {
						if (deleteErr) {
							eachCallback(deleteErr);
							return;
						}
						course.message(`Successfully deleted ${topic.title}`);
						eachCallback(null);
					});
				} else {
					eachCallback(null);
				}
			}, (err) => {
				if (err) {
					functionCallback(err);
				} else {
					functionCallback(null);
				}
			});
		});
	}

	/**********************************************
	 * moveContents()
	 * Parameters: functionCallback
	 **********************************************/
	function moveContents(functionCallback) {
		//move everything to the 'Student Resources' folder
		var order = [
			'University Policies',
			'Online Support Center',
			'Library Research Guides',
			'Academic Support Center',
			'Copyright & Source Information',
			'Copyright and Source Information'
		];

		var arrayOrders = [];

		//get the welcome module contents
		canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items`, (getErr, moduleItems) => {
			if (getErr) {
				functionCallback(getErr);
				return;
			}

			var functions = [
				asyncLib.apply(moveSuppResourcesContents, order, moduleItems, arrayOrders),
				moveStandardResourcesContents
			];

			for (var i = 0; i < order.length; i++) {
				for (var x = 0; x < moduleItems.length; x++) {
					if (order[i] === moduleItems[x].title) {
						arrayOrders.push(moduleItems[x].id);
						break;
					}
				}
			}

			asyncLib.waterfall(functions, (waterfallErr) => {
				if (waterfallErr) {
					functionCallback(waterfallErr);
					return;
				} else {
					functionCallback(null);
					return;
				}
			});
		});
	}

	function moveSuppResourcesContents(order, moduleItems, arrayOrders, functionCallback) {
		var count = 0;

		//for each item in the welcome module, move it to the student resources module
		//eachSeries helps avoid overloading the server
		asyncLib.eachSeries(moduleItems, (moduleItem, eachSeriesCallback) => {
			//ensuring that the links in the array are not underneath Standard Resources text title by setting position to 1
			if (!order.includes(moduleItem.title)) {
				canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items/${moduleItem.id}`, {
					'module_item': {
						'module_id': studentResourcesId,
						'indent': 1,
						'position': 1,
						'new_tab': true,
						'published': true
					}
				}, (putErr, results) => {
						if (putErr) {
							eachSeriesCallback(putErr);
						}
						count++;
						course.message(`Successfully moved ${results.title} into the Student Resources module`);
						eachSeriesCallback(null);
					});
			} else {
				eachSeriesCallback(null);
			}
		}, (err) => {
			if (err) {
				functionCallback(err);
				return;
			} else {
				functionCallback(null, arrayOrders, count);
				return;
			}
		});
	}

	function moveStandardResourcesContents(arrayOrders, count, functionCallback) {
		asyncLib.eachOfSeries(arrayOrders, (arrayOrder, key, eachOfSeriesCallback) => {
			canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items/${arrayOrder}`, {
				'module_item': {
					'module_id': studentResourcesId,
					'indent': 1,
					'position': key + count + 1,
					'new_tab': true,
					'published': true
				}
			}, (putErr, results) => {
				if (putErr) {
					eachOfSeriesCallback(putErr);
				} else {
					course.message(`Successfully moved ${results.title} into the Student Resources module`);
					eachOfSeriesCallback(null);
				}
			});
		}, (err) => {
			if (err) {
				functionCallback(err);
				return;
			} else {
				functionCallback(null);
				return;
			}
		});
	}

	/**********************************************
	 * deleteWelcomeModule()
	 * Parameters: functionCallback
	 **********************************************/
	function deleteWelcomeModule(functionCallback) {
		canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}`, (deleteErr, results) => {
			if (deleteErr) {
				functionCallback(deleteErr);
				return;
			} else {
				course.message('Successfully deleted the welcome folder');
				functionCallback(null);
			}
		});
	}

	/**********************************************
	 * moveStudentResourcesModule()
	 * Parameters: moveCallback
	 **********************************************/
	function moveStudentResourcesModule(moveCallback) {
		// move 'Student Resources' to be the last module
		canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${studentResourcesId}`, {
				'module': {
					//add one to account for the added syllabus module
					'position': modulesLength + 1,
					'published': true
				}
			},
			(moveErr, results) => {
				if (moveErr) {
					moveCallback(moveErr);
					return;
				} else {
					course.message('Successfully made Student Resources the last module');
					moveCallback(null);
				}
			});
	}

	/*************************************************
	 * welcomeFolder()
	 * Parameters: functionCallback
	 *************************************************/
	function welcomeFolder(functionCallback) {
		//do async.waterfall here to run each of the functions
		var myFunctions = [
			createSRHeader,
			deletePages,
			moveContents,
			deleteWelcomeModule,
			createSupplementalHeader,
			moveStudentResourcesModule
		];
		asyncLib.waterfall(myFunctions, (waterfallErr, result) => {
			if (waterfallErr) {
				functionCallback(waterfallErr);
				return;
			} else {
				functionCallback(null);
			}
		});
	}


	/********************************
	 *          STARTS HERE         *
	 ********************************/
	//Get module IDs since the course object does not come with a list of modules
	canvas.getModules(course.info.canvasOU, (getErr, moduleList) => {
		if (getErr) {
			course.error(getErr);
			return;
		} else {
			modulesLength = moduleList.length;
			course.message(`Successfully retrieved ${modulesLength} modules.`);

			//loop through list of modules set welcomeModuleId and studentResourcesId
			moduleList.forEach(module => {
				if (module.name === `Welcome`) {
					welcomeModuleId = module.id;
					course.message(`Welcome module ID: ${welcomeModuleId}`);
				} else if (module.name === `Student Resources`) {
					studentResourcesId = module.id;
					course.message(`Student Resources module ID: ${studentResourcesId}`);
				}
			});

			//end program if welcomeModuleId == -1
			if (welcomeModuleId <= -1 || welcomeModuleId === undefined) {
				//move on to the next child module
				course.warning('Welcome folder doesn\'t exist. Moving to the next child module');
				stepCallback(null, course);
			} else {
				//check to see if Student Resources module exists. if not, call a function to create one
				if (studentResourcesId <= -1) {
					makeStudentResourcesModule((postErr) => {
						if (postErr) {
							course.error(postErr);
							stepCallback(null, course);
							return;
						}
						//call function to move welcome folder contents to student resources modules
						welcomeFolder((welcomeErr) => {
							if (welcomeErr) {
								//err handling here
								course.error(welcomeErr);
								stepCallback(null, course);
								return;
							}
							course.message('disperse-welcome-folder successfully completed.');
							stepCallback(null, course);
							return;
						});
					});
				} else {
					canvas.getModuleItems(course.info.canvasOU, studentResourcesId, (getModuleItemsErr, moduleItems) => {
						if (getModuleItemsErr) {
							course.error(getModuleItemsErr);
							stepCallback(null, course);
							return;
						}
						if (moduleItems.length <= 0 || moduleItems == undefined) {
							course.message(`Student Resources module is empty`)
							welcomeFolder(course, (welcomeErr, course) => {
								if (welcomeErr) {
									//err handling here
									course.error(welcomeErr);
									stepCallback(null, course);
									return;
								}
								course.message('disperse-welcome-folder successfully completed.');
								stepCallback(null, course);
								return;
							});
						}
						course.message(`Student Resources module already existed`);
						stepCallback(null, course);
					});

				}
			}
		}
	});
}