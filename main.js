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
var modules_length = -1;

module.exports = (course, stepCallback) => {

    /* View available course object functions */
    // https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

    /**********************************************
     * makeStudentResourcesModule()
     * Parameters: course object, functionCallback
     **********************************************/
    function makeStudentResourcesModule(course, functionCallback) {
        //course.success(`disperse-welcome-folder`, `No Student Resources folder. About to create one.`);

        //create the module
        canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules`, {
                'module': {
                    'name': 'Student Resources'
                }
            },
            (postErr, module) => {
                if (postErr) {
                    // handle errs in the functionCallback
                    functionCallback(postErr, course);
                    return;
                } else {
                    course.success(`disperse-welcome-folder`,
                        `Successfully created Student Resources module. SR ID: ${module.id}`);

                    //the update module call in the canvas api requires the endpoint module id
                    student_resources_id = module.id;
                    functionCallback(null, course);
                }
            });
    }

    /**********************************************
     * createSRHeader()
     * Parameters: functionCallback
     **********************************************/
    function createSRHeader(functionCallback) {
        //create Standard Resources text header
        canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${student_resources_id}/items`, {
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
                    course.success(`disperse-welcome-folder`, `Successfully created Standard Resources text header`);
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
					'How to Understand Due Dates'
			];
        //delete "How to Understand Due Dates" if it exists
        canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules/${welcome_module_id}/items`, (getErr, module_items) => {
            if (getErr) {
                // move err handling to callback
                functionCallback(getErr);
                return;
            }
            course.success(`disperse-welcome-folder`, `Successfully retrieved ${module_items.length} module items in Welcome Module`);
            asyncLib.each(module_items, (topic, eachCallback) => {
                //Standard Naming Scheme: How to Understand Due Dates
                //Might have to use Regex to catch all possible scenarios
                if (pagesToDelete.includes(topic.title)) {
                    canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${welcome_module_id}/items/${topic.id}`, (deleteErr, results) => {
                        if (deleteErr) {
                            eachCallback(deleteErr);
                            return;
                        }
                        course.success(`disperse-welcome-module`, `Successfully deleted ${topic.title}`);
                        eachCallback(null);
                    });
                } else {
                    eachCallback(null);
                }
            }, (err) => {
                if (err) {
                    functionCallback(err);
                } else {
                    functionCallback(null, course);
                }
            });
        });
    }

    /**********************************************
     * moveContents()
     * Parameters: course object, functionCallback
     **********************************************/
    function moveContents(course, functionCallback) {
        //move everything to student resources folder
        //https://canvas.instructure.com/doc/api/modules.html#method.context_module_items_api.update
		var srArr = [
			'University Policies',
			'Online Support Center',
			'Library Research Guides',
			'Academic Support Center',
			'Copyright & Source Information',
			'Copyright and Source Information'
		];

        //get the welcome module contents
        canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules/${welcome_module_id}/items`, (getErr, module_items) => {
            if (getErr) {
                functionCallback(getErr);
                return;
            }

            //for each item in the welcome module, move it to the student resources module
            asyncLib.each(module_items, (module_item, eachCallback) => {
				if (srArr.includes(module_item.title)) {
					canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${welcome_module_id}/items/${module_item.id}`, {
							'module_item': {
								'module_id': student_resources_id,
								'indent': 1
							}
						},
						(putErr, results) => {
							if (putErr) {
								eachCallback(putErr);
								return;
							}
							course.success(`disperse-welcome-folder`,
								`Successfully moved ${results.title} into the Student Resources module`);
							eachCallback(null, course);
						});
				//ensuring that the links in the array are not underneath Standard Resources text title by setting position to 1
				} else {
					canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${welcome_module_id}/items/${module_item.id}`, {
							'module_item': {
								'module_id': student_resources_id,
								'indent': 1,
								'position': 1
							}
						},
						(putErr, results) => {
							if (putErr) {
								console.log(putErr);
								eachCallback(putErr);
								return;
							}
							course.success(`disperse-welcome-folder`,
								`Successfully moved ${results.title} into the Student Resources module`);
							eachCallback(null, course);
						});
				}
            }, (err) => {
                if (err) {
                    functionCallback(err);
                    return;
                }
                functionCallback(null, course);
            });
        });
    }

    function deleteWelcomeModule(course, functionCallback) {
        canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${welcome_module_id}`, (deleteErr, results) => {
            if (deleteErr) {
                functionCallback(deleteErr);
                return;
            } else {
                course.success(`disperse-welcome-folder`, `Successfully deleted the welcome folder`);
                functionCallback(null, course);
            }
        });
    }

    function moveStudentResourcesModule(course, moveCallback) {
        canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${student_resources_id}`, {
                'module': {
					//add one to account for the added syllabus module
                    'position': modules_length + 1
                }
            },
            (moveErr, results) => {
                if (moveErr) {
                    moveCallback(moveErr);
                    return;
                } else {
                    course.success(`disperse-welcome-folder`, `Successfully made Student Resources the last module`);
                    moveCallback(null, course);
                }
            });

    }

    /*************************************************
     * welcomeFolder()
     * Parameters: Course object, functionCallback
     *************************************************/
    function welcomeFolder(course, functionCallback) {
        //do async.waterfall here to run each of the functions
        var myFunctions = [
				createSRHeader,
				deletePages,
				moveContents,
				deleteWelcomeModule,
                moveStudentResourcesModule
		];
        asyncLib.waterfall(myFunctions, (waterfallErr, result) => {
            if (waterfallErr) {
                functionCallback(waterfallErr, course);
                return;
            } else {
                functionCallback(null, course);
            }
        });

    }

    /* Create the module report so that we can access it later as needed.
    This MUST be done at the beginning of each child module. */
    course.addModuleReport('disperse-welcome-folder');

    /********************************
     *          STARTS HERE         *
     ********************************/
    //Get module IDs since the course object does not come with a list of modules
    canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules`, (getErr, module_list) => {
        if (getErr) {
            course.throwErr(`disperse-welcome-folder`, getErr);
            return;
        } else {
            var manifest = course.content.find(file => {
                return file.name == 'imsmanifest.xml';
            });

            var $ = manifest.dom;

            modules_length = manifest.dom('organization>item').length;

            course.success(`disperse-welcome-folder`, `Successfully retrieved ${modules_length} modules.`);

            //loop through list of modules and get the IDs
            module_list.forEach(module => {
                if (module.name == `Welcome`) {
                    welcome_module_id = module.id;
                    course.success(`disperse-welcome-folder`, `Welcome module ID: ${welcome_module_id}`);
                } else if (module.name == `Student Resources`) {
                    student_resources_id = module.id;
                    course.success(`disperse-welcome-folder`, `Student Resources module ID: ${student_resources_id}`);
                }
            });

            //end program if welcome_module_id == -1
            if (welcome_module_id <= -1) {
                //move on to the next child module
                course.throwWarning('disperse-welcome-folder', 'Welcome folder doesn\'t exist. Moving on...');
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
                                //err handling here
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
