/*eslint-env node, es6*/
/*eslint no-console:1*/

/* Module Description */

/* Put dependencies here */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

//ids for modules
var welcome_module_id = -1;
var student_resources_id = -1;

module.exports = (course, stepCallback) => {

	/* View available course object functions */
	// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

	/**********************************************
	 * makeStudentResourcesModule()
	 * Parameters: course object
	 **********************************************/
	function makeStudentResourcesModule(course, cb) {
		//course.success(`disperse-welcome-folder`, `No Student Resources folder. About to create one.`);

		//create the module
		canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules`, {
				'module[name]': 'Student Resources'
			},
			(postErr, module) => {
				if (postErr) {
					// handle errs in the cb
					cb(postErr, course);
					return;
				} else {
					course.success(`disperse-welcome-folder`,
						`Successfully created Student Resources module. SR ID: ${module.id}`);

					//the update module call in the canvas api requires the endpoint module id
					student_resources_id = module.id;
					cb(null, course);
				}
			});
	}

	/**********************************************
	 * createSRHeader()
	 * Parameters: course object, student resources id
	 **********************************************/
	function createSRHeader(callback) {
		//create Standard Resources text header
		// I MAY BE BREAKING EVERYTHING...
		canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${student_resources_id}/items`), {
				'module_item': {
					'title': 'Standard Resources',
					'type': 'SubHeader'
				}
			},
			(postErr, results) => {
				if (postErr) {
					// move err handling to callback
					callback(postErr);
					return;
				} else {
					course.success(`disperse-welcome-folder`, `Successfully created Standard Resources text header`);
					callback(null);
				}
			};
	}

	/**********************************************
	 * deletePages()
	 * Parameters: course object, welcome id
	 **********************************************/
	function deletePages(callback) {
		var pagesToDelete = [
					'How to Understand Due Dates'
			];
		//delete "How to Understand Due Dates" if it exists
		canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules/${welcome_module_id}/items`, (getErr, module_items) => {
			if (getErr) {
				// move err handling to callback
				callback(getErr);
				return;
			}
			course.success(`disperse-welcome-folder`, `Successfully retrieved ${module_items.length} module items in Welcome Module`);
			asyncLib.each(module_items, (topic, cb) => {
				//Standard Naming Scheme: How to Understand Due Dates
				//Might have to use Regex to catch all possible scenarios
				if (pagesToDelete.includes(topic.title)) {
					canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${welcome_module_id}/items/${topic.id}`, (deleteErr, results) => {
						if (deleteErr) {
							cb(deleteErr);
							return;
						}
						course.success(`disperse-welcome-module`, `Successfully deleted moduleNameHere`);
						cb(null);
					});
				} else {
					cb(null);
				}
			});
		});
	}

	/**********************************************
	 * moveContents()
	 * Parameters: course object, welcome module id,
	 * student resources id
	 **********************************************/
	function moveContents(course, callback) {
		//move everything to student resources folder
		//https://canvas.instructure.com/doc/api/modules.html#method.context_module_items_api.update

		//get the welcome module contents
		canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules/${welcome_module_id}/items`, (getErr, module_items) => {
			if (getErr) {
				callback(getErr);
				return;
			}
			course.success(`disperse-welcome-folder`, `Successfully retrieved ${module_items.length} module items in Welcome Module`);
			//for each item in the welcome module, move it to the student resources module
			asyncLib.each(module_items, (module_item, cb) => {
				canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/items/${module_item.id}`, {
						'module_item': {
							'module_id': student_resources_id
						}
					},
					(putErr, item) => {
						if (putErr) {
							cb(putErr);
							return;
						}
						course.success(`disperse-welcome-folder`, `Successfully moved ${item.title} into the Student Resources Module`);
						cb(null);
					});
			}, (err) => {
				if (err) {
					callback(err);
					return;
				}
				callback(null);
			});
		});
	}

	/*************************************************
	 * welcomeFolder()
	 * Parameters: Course object, welcome module id,
	 * student resources id
	 *************************************************/
	function welcomeFolder(course, cb) {
		//do async.waterfall here to run each of the functions
		var myFunctions = [
				createSRHeader,
				deletePages,
				moveContents
		];
		asyncLib.waterfall(myFunctions, (waterfallErr, result) => {
			if (waterfallErr) {
				cb(waterfallErr, course);
				return;
			} else {
				cb(null, course);
			}
		});

	}



	/* Create the module report so that we can access it later as needed.
	This MUST be done at the beginning of each child module. */
	course.addModuleReport('disperse-welcome-folder');


	/*******************************
	 *           START HERE         *
	 ********************************/
	//Get module IDs since the course object does not come with a list of modules
	canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules`, (getErr, module_list) => {
		if (getErr) {
			course.throwErr(`disperse-welcome-folder`, getErr);
			return;
		} else {
			course.success(`disperse-welcome-folder`, `Successfully retrieved modules list`);
			//loop through list of modules and get the IDs

			module_list.forEach(module => {
				if (module.name == `Welcome`) {
					welcome_module_id = module.id;
				} else if (module.name == `Student Resources`) {
					student_resources_id = module.id;
				}
			});

			//end program if welcome_module_id == -1
			if (welcome_module_id == -1) {
				//move on to the next child module

				course.throwWarning('disperse-welcome-folder', 'welcome folder doesn\'t exist. Moving on...');
				stepCallback(null, course);
			} else {
				//check to see if Student Resources module exists. if not, call a function to create one
				if (student_resources_id <= -1) {
					makeStudentResourcesModule(course, (postErr, course) => {
						if (postErr) {
							course.throwErr(`disperse-welcome-folder`, postErr);
							stepCallback(null, course);
							return;
						}
						//call function to move welcome folder contents to student resources modules
						welcomeFolder(course, (welcomeErr, course) => {
							if (welcomeErr) {
								// err handling here
								course.throwErr('disperse-welcome-folder', welcomeErr);
								stepCallback(null, course);
								return;
							}
							course.success('disperse-welcome-folder', 'disperse-welcome-folder successfully completed.');
							stepCallback(null, course);
						});
					});
				}
			}
		}
	});
}
