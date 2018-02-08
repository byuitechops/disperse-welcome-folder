/*eslint-env node, es6*/
/*eslint no-console:0*/

/* Module Description */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

//ids for modules
var welcomeModuleId = -1;
var studentResourcesId = -1;
var resourcesId = -1;
var modulesLength = -1;

module.exports = (course, stepCallback) => {
    /**********************************************
     * makeStudentResourcesModule()
     * Parameters: course object, functionCallback
     **********************************************/
    function makeStudentResourcesModule(makeStudentResourcesModuleCallback) {
        //first check to see if one already exists. If not, studentResourcesId should still be set to -1 or undefined/null
        if (studentResourcesId <= -1 || studentResourcesId === undefined) {
            //create the module
            canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules`, {
                    'module': {
                        'name': 'Student Resources'
                    }
                },
                (postErr, module) => {
                    if (postErr) {
                        //handle errs in the functionCallback
                        makeStudentResourcesModuleCallback(postErr);
                        return;
                    } else {
                        course.message(`Successfully created Student Resources module. SR ID: ${module.id}`);
                        //the update module call in the canvas api requires the endpoint module id
                        studentResourcesId = module.id;
                        makeStudentResourcesModuleCallback(null);
                        return;
                    }
                });
        } else {
            makeStudentResourcesModuleCallback(null);
        }
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
     * Parameters: deletePagesCallback
     **********************************************/
    function deletePages(deletePagesCallback) {
        var pagesToDelete = [
			//singular 'Date' instead of 'Dates' in case of misspelling. Check using '.includes()'
			'How to Understand Due Date'
		];
        //delete "How to Understand Due Dates" if it exists
        canvas.getModuleItems(course.info.canvasOU, welcomeModuleId, (getErr, moduleItems) => {
            if (getErr) {
                // move err handling to callback
                deletePagesCallback(getErr);
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
                    deletePagesCallback(err);
                } else {
                    deletePagesCallback(null);
                }
            });
        });
    }

    /**********************************************
     * moveResourcesContent()
     * Parameters: course object, moveResourcesContentCallback
     **********************************************/
    function moveResourcesContent(moveResourcesContentCallback) {
        //move everything to the 'Student Resources' folder
        if (resourcesId <= -1 || resourcesId === undefined) {
            course.message(`There is no Resources module in this course. No need to move its contents or delete it.`);
            moveResourcesContentCallback(null);
            return;
        }
        //get the module items from the resources module
        canvas.getModuleItems(course.info.canvasOU, resourcesId, (getErr, moduleItems) => {
            if (getErr) {
                moveResourcesContentCallback(getErr);
                return;
            }

            //for each item in the welcome module, move it to the student resources module
            //eachSeries helps avoid overloading the server
            asyncLib.eachSeries(moduleItems, (moduleItem, eachLimitCallback) => {
                canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${resourcesId}/items/${moduleItem.id}`, {
                        'module_item': {
                            'module_id': studentResourcesId,
                            'indent': 1,
                            'new_tab': true,
                            'published': true
                        }
                    },
                    (putErr, item) => {
                        if (putErr) {
                            eachLimitCallback(putErr);
                            return;
                        }
                        course.message(`Successfully moved ${item.title} into the Student Resources module`);
                        eachLimitCallback(null);
                    });
            }, (eachSeriesErr) => {
                if (eachSeriesErr) {
                    moveResourcesContentCallback(eachSeriesErr);
                    return;
                }
                moveResourcesContentCallback(null);
            });
        });
    }

    /**********************************************
     * moveWelcomeContent()
     * Parameters: course object, moveWelcomeContentCallback
     **********************************************/
    function moveWelcomeContent(moveWelcomeContentCallback) {
        //move everything to the 'Student Resources' folder

        var topics = [
			'University Policies',
			'Online Support Center',
			'Library Research Guides',
			'Academic Support Center',
			'Copyright & Source Information',
			'Copyright and Source Information'
		];

        //get the welcome module's module items
        canvas.getModuleItems(course.info.canvasOU, welcomeModuleId, (getErr, moduleItems) => {
            if (getErr) {
                moveWelcomeContentCallback(getErr);
                return;
            }

            //for each item in the welcome module, move it to the student resources module
            //eachSeries helps avoid overloading the server
            asyncLib.eachSeries(moduleItems, (moduleItem, eachLimitCallback) => {
                if (topics.includes(moduleItem.title)) {
                    canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items/${moduleItem.id}`, {
                            'module_item': {
                                'module_id': studentResourcesId,
                                'indent': 1,
                                'new_tab': true,
                                'published': true
                            }
                        },
                        (putErr, results) => {
                            if (putErr) {
                                eachLimitCallback(putErr);
                                return;
                            }
                            course.message(`Successfully moved ${results.title} into the Student Resources module`);
                            eachLimitCallback(null);
                        });
                    //ensuring that the links in the array are not underneath Standard Resources text title by setting position to 1
                } else {
                    canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items/${moduleItem.id}`, {
                            'module_item': {
                                'module_id': studentResourcesId,
                                'indent': 1,
                                'position': 1,
                                'new_tab': true,
                                'published': true
                            }
                        },
                        (putErr, results) => {
                            if (putErr) {
                                eachLimitCallback(putErr);
                                return;
                            }
                            course.message(`Successfully moved ${results.title} into the Student Resources module`);
                            eachLimitCallback(null);
                        });
                }
            }, (eachSeriesErr) => {
                if (eachSeriesErr) {
                    moveWelcomeContentCallback(eachSeriesErr);
                    return;
                }
                moveWelcomeContentCallback(null);
            });
        });
    }

    /**********************************************
     * deleteModules()
     * Parameters: course object, functionCallback
     **********************************************/
    function deleteModules(deleteModulesCallback) {
        //if resources module exists, delete it
        if (resourcesId != -1 && resourcesId !== undefined) {
            canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${resourcesId}`, (deleteErr, results) => {
                if (deleteErr) {
                    course.error(deleteErr);
                } else {
                    course.message('Successfully deleted the Resources module');
                }
            });
        }
        canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}`, (deleteErr, results) => {
            if (deleteErr) {
                deleteModulesCallback(deleteErr);
                return;
            } else {
                course.message('Successfully deleted the Welcome module');
                deleteModulesCallback(null);
            }
        });
    }

    /**********************************************
     * moveStudentResourcesModule()
     * Parameters: course object, moveCallback
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
     * Parameters: Course object, functionCallback
     *************************************************/
    function welcomeFolder(functionCallback) {
        //do async.waterfall here to run each of the functions
        var myFunctions = [
			createSRHeader,
			deletePages,
//			moveResourcesContent,
            moveWelcomeContent,
			deleteModules,
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
                } else if (module.name === `Resources`) {
                    resourcesId = module.id;
                    course.message(`Resources module ID: ${resourcesId}`);
                }
                return;
            });

            //end program if there is no welcome module and no resources module
            if ((welcomeModuleId <= -1 || welcomeModuleId === undefined) && (resourcesId <= -1 || resourcesId === undefined)) {
                //move on to the next child module
                course.warning('The Welcome folder and Resources folder don\'t exist. Moving to the next child module');
                stepCallback(null, course);
            } else {
                //check to see if Student Resources module exists. If not, call a function to create one
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
                //if a resources module exists, move its contents into student resources and delete it
                console.log(`resourcesId is ${resourcesId}`);
                if (resourcesId != -1 && resourcesId !== undefined) {
                    console.log(`resourcesID != -1`);
                    canvas.getModuleItems(course.info.canvasOU, resourcesId, (getModuleItemsErr, moduleItems) => {
                        if (getModuleItemsErr) {
                            course.error(getModuleItemsErr);
                            stepCallback(null, course);
                            return;
                        }
                        if (moduleItems.length <= 0 || moduleItems == undefined) {
                            course.message(`Student Resources module exists already, but is empty`)
                            //                            welcomeFolder((welcomeErr, course) => {
                            //                                if (welcomeErr) {
                            //                                    //err handling here
                            //                                    course.error(welcomeErr);
                            //                                    stepCallback(null, course);
                            //                                    return;
                            //                                }
                            //                                course.message('disperse-welcome-folder successfully completed.');
                            //                                stepCallback(null, course);
                            //                                return;
                            //                            });
                            stepCallback(null, course);
                        } else {
                            //call waterfall on the needed functions to move contents to the student resources module
                        }
                    });

                }
            }
        }
    });
}
