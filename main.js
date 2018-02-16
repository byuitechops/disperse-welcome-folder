/*eslint-env node, es6*/
/*eslint no-console:1*/

/* Module Description */
/* This child module goes through the welcome module and moves everything over to the
Student Resources module. After moving everything, it deletes the welcome folder.*/

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

//ids for modules - set to -1 to help with error handling
var welcomeModuleId = -1;
var studentResourcesId = -1;
var resourcesId = -1; // a module that could exist, but shouldn't
var modulesLength = -1;

module.exports = (course, stepCallback) => {
    /*************************************************
	 * getModuleIds()
	 * Parameters: getModulesIdsCallback
	 *************************************************/
    function getModuleIds(getModuleIdsCallback) {
        //Get module IDs since the course object does not come with a list of modules
        canvas.getModules(course.info.canvasOU, (getModulesErr, moduleList) => {
            if (getModulesErr) {
                getModuleIdsCallback(getModulesErr);
                return;
            } else {
                modulesLength = moduleList.length;
                course.message(`Successfully retrieved ${modulesLength} modules.`);

                //loop through list of modules and set the different IDs
                asyncLib.each(moduleList, (module, eachCallback) => {
                    if (module.name === 'Welcome') {
                        welcomeModuleId = module.id;
                        // course.message(`Welcome module ID: ${welcomeModuleId}`);
                    } else if (module.name === 'Student Resources') {
                        studentResourcesId = module.id;
                        // course.message(`Student Resources module ID: ${studentResourcesId}`);
                    } else if (module.name === 'Resources') {
                        resourcesId = module.id;
                        // course.message(`Resources module ID: ${resourcesId}`);
                    }

                    //call the next iteration of asyncLib.each()
                    eachCallback(null);

                }, (eachErr) => {
                    if (eachErr) {
                        getModuleIdsCallback(eachErr);
                        return;
                    }

                    // end program if there is no welcome module and no resources module
                    if ((welcomeModuleId == -1 || welcomeModuleId === undefined) && (resourcesId == -1 || resourcesId === undefined)) {
                        //move on to the next child module
                        course.warning('The Welcome folder and Resources folder don\'t exist.');
                        stepCallback(null, course);
                        return;
                    }
                    /* else if (welcomeModuleId <= -1 || welcomeModuleId === undefined) {
					    course.message('The Welcome folder does not exist but a Resources module does');
					} else if (resourcesId <= -1 || resourcesId === undefined) {
					    course.message('The Resources folder does not exist but the Welcome module does');
					} else {
					    course.message('The Welcome folder and Resources folder both exist');
					} */
                    getModuleIdsCallback(null);
                });
            }
        });
    }

    /**********************************************
	 * makeStudentResourcesModule()
	 * Parameters: makeStudentResourcesCallback
	 **********************************************/
    function makeStudentResourcesModule(makeStudentResourcesCallback) {
        //first check to see if one already exists. If not, studentResourcesId should still be set to -1 or undefined/null
        if (studentResourcesId >= 0) {
            makeStudentResourcesCallback(null);
            return;
        }

        //create the module
        canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules`, {
            'module': {
                'name': 'Student Resources'
            }
        },
        (postErr, module) => {
            if (postErr) {
                //handle errs in the makeStudentResourcesCallback
                makeStudentResourcesCallback(postErr);
                return;
            } else {
                course.message(`Successfully created Student Resources module. Id: ${module.id}`);
                //the update module call in the canvas api requires the endpoint module id
                studentResourcesId = module.id;
                makeStudentResourcesCallback(null);
                return;
            }
        });
    }

    /**********************************************
	 * getResourcesContents()
	 * Parameters: getResourcesContentsCallback
	 **********************************************/
    function getResourcesContents(getResourcesContentsCallback) {
        //if there is no resources module, skip this function
        if (resourcesId === -1 || resourcesId === undefined) {
            getResourcesContentsCallback(null, null);
            return;
        }
        // get module items from the Resources module, move them to the Student Resources module, and delete the module
        canvas.getModuleItems(course.info.canvasOU, resourcesId, (getModuleItemsErr, moduleItems) => {
            if (getModuleItemsErr) {
                getResourcesContentsCallback(getModuleItemsErr, null);
                return;
            }
            //send the moduleItems to the next function to see if the contents need to be moved into the student resources module or not
            getResourcesContentsCallback(null, moduleItems);
        });
    }

    /**********************************************
	 * moveResourcesContent()
	 * Parameters: resourcesModuleItems, moveResourcesContentCallback
	 **********************************************/
    function moveResourcesContent(resourcesModuleItems, moveResourcesContentCallback) {
        /* if there is no resources module, or if it exists but is empty, move to the next function */
        if (resourcesId <= -1 || resourcesId === undefined || resourcesModuleItems.length <= 0 || resourcesModuleItems === undefined) {
            course.message('The Resources module either doesn\'t exist, or is empty. No need to move its contents');
            moveResourcesContentCallback(null);
            return;
        }


        // for each item in the welcome module, move it to the student resources module
        // eachSeries helps avoid overloading the server
        asyncLib.eachSeries(resourcesModuleItems, (moduleItem, eachLimitCallback) => {
            canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${resourcesId}/items/${moduleItem.id}`, {
                'module_item': {
                    'module_id': studentResourcesId,
                    'indent': 1,
                    'position': 1,
                    'new_tab': true,
                    'published': true
                }
            },
            (putErr, item) => {
                if (putErr) {
                    eachLimitCallback(putErr);
                    return;
                }
                course.message(`Successfully moved ${item.title} into the Student Resources module from the Resources module`);
                eachLimitCallback(null);
            });
        }, (eachSeriesErr) => {
            if (eachSeriesErr) {
                moveResourcesContentCallback(eachSeriesErr);
                return;
            }
            moveResourcesContentCallback(null);
        });
    }

    /**********************************************
	 * deletePages()
	 * Parameters: deletePagesCallback
	 **********************************************/
    function deletePages(deletePagesCallback) {
        //if no welcome module exists, move to the next function
        if (welcomeModuleId <= -1 || welcomeModuleId === undefined) {
            deletePagesCallback(null);
            return;
        }

        //an array of pages to delete in array form in case we want to add more pages to it later
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
            } else {
                course.message(`Successfully retrieved ${moduleItems.length} module items in Welcome Module`);
                asyncLib.each(moduleItems, (topic, eachCallback) => {
                    //Standard Naming Scheme: How to Understand Due Dates
                    if (pagesToDelete.includes(topic.title)) {
                        canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items/${topic.id}`, (deleteErr) => {
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
            }
        });
    }

    /**********************************************
	 * moveWelcomeContent()
	 * Parameters: moveWelcomeContentCallback
	 **********************************************/
    function moveWelcomeContent(moveWelcomeContentCallback) {
        var itemOrders = [];
        var count = 0;

        //move everything to the 'Student Resources' folder
        //if no welcome module exists, move to the next function
        if (welcomeModuleId <= -1 || welcomeModuleId === undefined) {
            moveWelcomeContentCallback(null);
            return;
        }

        var order = [
            'University Policies',
            'Online Support Center',
            'Library Research Guide',
            'Academic Support Center',
            'Copyright & Source Information',
            'Copyright and Source Information'
        ];


        //get the module items from the welcome module
        canvas.getModuleItems(course.info.canvasOU, welcomeModuleId, (getErr, moduleItems) => {
            if (getErr) {
                moveWelcomeContentCallback(getErr);
                return;
            }

            //build an array that supports the required order found in OCT
            for (var i = 0; i < order.length; i++) {
                for (var x = 0; x < moduleItems.length; x++) {
                    //found the item -> push and break out of inner loop
                    if (order[i] === moduleItems[x].title) {
                        itemOrders.push(moduleItems[x].id);
                        break;
                    }
                }
            }

            //for each item in the welcome module, move it to the student resources module
            //eachSeries helps avoid overloading the server
            asyncLib.eachOfSeries(moduleItems, (moduleItem, key, eachCallback) => {
                //check if it belongs in the Standard Resources subHeader. If not, set position to '1' to put under Supplemental Resources subHeader
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
                            eachCallback(putErr);
                            return;
                        } else {
                            count++;
                            course.message(`Successfully moved ${results.title} into the Student Resources module`);
                            eachCallback(null);
                        }
                    });
                } else {
                    eachCallback(null);
                }
            }, (eachSeriesErr) => {
                if (eachSeriesErr) {
                    moveWelcomeContentCallback(eachSeriesErr);
                    return;
                } else {
                    moveWelcomeContentCallback(null, itemOrders, count);
                }
            });
        });
    }

    /**********************************************
	 * moveAdditionalWelcomeContents()
	 * Parameters: itemOrders, count, moveAdditionalWelcomeCallback
	 **********************************************/
    function moveAdditionalWelcomeContents(itemOrders, count, moveAdditionalWelcomeCallback) {
        asyncLib.eachOfSeries(itemOrders, (itemOrder, key, eachOfSeriesCallback) => {
            //go through and put every item in itemOrder (the part for required order portion) into the
            //student resources module at position + 1
            canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items/${itemOrder}`, {
                'module_item': {
                    'module_id': studentResourcesId,
                    'indent': 1,
                    'position': key + count + 1, //putting it after the non-required order portion
                    'new_tab': true,
                    'published': true
                }
            },
            (putErr, results) => {
                if (putErr) {
                    eachOfSeriesCallback(putErr);
                    return;
                } else {
                    course.message(`Successfully moved ${results.title} into the Student Resources module`);
                    eachOfSeriesCallback(null);
                }
            });
        }, (eachOfSeriesErr) => {
            if (eachOfSeriesErr) {
                moveAdditionalWelcomeCallback(eachOfSeriesErr);
                return;
            } else {
                moveAdditionalWelcomeCallback(null, count);
                return;
            }
        });
    }

    /**********************************************
	 * createStandardResources()
	 * Parameters: createStandardResourcesCallback
	 **********************************************/
    function createStandardResources(count, createStandardResourcesCallback) {
        //create 'Standard Resources' text header
        canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${studentResourcesId}/items`, {
            'module_item': {
                'title': 'Standard Resources',
                'type': 'SubHeader',
                'position': count + 1 //put it just before University Policies activity
            }
        },
        (postErr) => {
            if (postErr) {
                /* still try to move everything around! */
                course.error(postErr);
            } else {
                course.message('Successfully created Standard Resources text header');
                createStandardResourcesCallback(null);
            }
        });
    }

    /**********************************************
	 * deleteModules()
	 * Parameters: deleteModulesCallback
	 **********************************************/
    function deleteModules(deleteModulesCallback) {
        //if resources module exists, delete it
        if (resourcesId !== -1 && resourcesId !== undefined) {
            canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${resourcesId}`, (deleteErr) => {
                if (deleteErr) {
                    course.error(deleteErr);
                } else {
                    course.message('Successfully deleted the Resources module');
                }
            });
        }

        //if a welcome module exists, delete it
        if (welcomeModuleId !== -1 && welcomeModuleId !== undefined) {
            canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}`, (deleteErr) => {
                if (deleteErr) {
                    deleteModulesCallback(deleteErr);
                    return;
                }
                course.message('Successfully deleted the Welcome module');
                deleteModulesCallback(null);
            });
        } else
            deleteModulesCallback(null);
    }

    /**********************************************
	 * createSupplementalHeader()
	 * Parameters: createSupplementalCallback
	 **********************************************/
    function createSupplementalHeader(createSupplementalCallback) {
        //create 'Supplemental Resources' text header
        canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${studentResourcesId}/items`, {
            'module_item': {
                'title': 'Supplemental Resources',
                'type': 'SubHeader',
                'position': 1
            }
        },
        (postErr) => {
            if (postErr) {
                createSupplementalCallback(postErr);
                return;
            } else {
                course.message('Successfully created Supplemental Resources text header');
                createSupplementalCallback(null);
            }
        });
    }

    /**********************************************
	 * moveStudentResourcesModule()
	 * Parameters: moveCallback
	 **********************************************/
    function moveStudentResourcesModule(moveCallback) {
        //if no studentResources module exists, move to the next function
        if (studentResourcesId <= -1 || studentResourcesId === undefined) {
            moveCallback(null);
            return;
        }

        // move 'Student Resources' to be the last module
        canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${studentResourcesId}`, {
            'module': {
                // add one to account for the added syllabus module
                'position': modulesLength + 1,
                'published': true
            }
        },
        (moveErr) => {
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
	 * Parameters: none
	 *************************************************/
    function welcomeFolder() {
        /* the functions to waterfall through */
        var myFunctions = [
            getModuleIds,
            makeStudentResourcesModule,
            getResourcesContents,
            moveResourcesContent,
            deletePages,
            moveWelcomeContent,
            moveAdditionalWelcomeContents,
            createStandardResources,
            deleteModules,
            createSupplementalHeader,
            moveStudentResourcesModule
        ];

        /* do async.waterfall here to run each of the functions */
        asyncLib.waterfall(myFunctions, (waterfallErr) => {
            if (waterfallErr) {
                course.error(waterfallErr);
                return;
            }
            stepCallback(null, course);
        });
    }

    /********************************
	 *          STARTS HERE         *
	 ********************************/
    welcomeFolder();
};