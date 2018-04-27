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
    /******************************************************************************
     * getModuleIds()
     * Parameters: getModulesIdsCallback
     * Get the list of modules and assign their module id's to the global variables
     ******************************************************************************/
    function getModuleIds(getModuleIdsCallback) {
        /* get module IDs since the course object does not come with a list of modules */
        canvas.getModules(course.info.canvasOU, (getModulesErr, moduleList) => {
            if (getModulesErr) {
                getModuleIdsCallback(getModulesErr);
                return;
            } else {
                modulesLength = moduleList.length;
                course.message(`Successfully retrieved ${modulesLength} modules.`);

                /* loop through list of modules and set the different IDs */
                asyncLib.each(moduleList, (module, eachCallback) => {
                    if (/^\s*welcome(\s|\S)?\s*$/i.test(module.name)) {
                        welcomeModuleId = module.id;
                    } else if (/^\s*student\s*resources\s*$/i.test(module.name)) {
                        studentResourcesId = module.id;
                    } else if (/^\s*resources\s*$/i.test(module.name)) {
                        resourcesId = module.id;
                    }
                    /* call the next iteration of asyncLib.each() */
                    eachCallback(null);

                }, (eachErr) => {
                    if (eachErr) {
                        getModuleIdsCallback(eachErr);
                        return;
                    }
                    /* If the welcome module doesn't exist but the resources module does, 
                    treat the resources module as if it were the welcome module */
                    if (welcomeModuleId === -1 && resourcesId !== -1) {
                        welcomeModuleId = resourcesId;
                        resourcesId = -1;
                    }
                    /* end program if there is no welcome module and no resources module */
                    if ((welcomeModuleId === -1 || typeof welcomeModuleId === "undefined") &&
                        (resourcesId === -1 || typeof resourcesId === "undefined")) {
                        /* move on to the next child module */
                        course.warning('The Welcome folder and Resources folder don\'t exist.');
                        stepCallback(null, course);
                        return;
                    }
                    getModuleIdsCallback(null);
                });
            }
        });
    }

    /*****************************************************************************************
     * makeStudentResourcesModule()
     * Parameters: makeStudentResourcesCallback
     * Create a Student Resources module to put all the welcome/resources folders content into
     *****************************************************************************************/
    function makeStudentResourcesModule(makeStudentResourcesCallback) {
        /* first check to see if one already exists. If not, studentResourcesId should still be set to -1 or undefined/null */
        if (studentResourcesId !== -1) {
            makeStudentResourcesCallback(null);
            return;
        }

        /* create the Student Resources module */
        canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules`, {
                'module': {
                    'name': 'Student Resources'
                }
            },
            (postErr, module) => {
                if (postErr) {
                    /* handle errs in the makeStudentResourcesCallback */
                    makeStudentResourcesCallback(postErr);
                    return;
                } else {
                    course.message(`Successfully created Student Resources module. Id: ${module.id}`);
                    /* the update module call in the canvas api requires the endpoint module id */
                    studentResourcesId = module.id;
                    makeStudentResourcesCallback(null);
                    return;
                }
            });
    }

    /************************************************
     * getResourcesContents()
     * Parameters: getResourcesContentsCallback
     * Get the module items from the resources folder
     ************************************************/
    function getResourcesContents(getResourcesContentsCallback) {
        /* if there is no resources module, skip this function */
        if (resourcesId === -1 || typeof resourcesId === "undefined") {
            getResourcesContentsCallback(null, null);
            return;
        }
        /* get module items from the Resources module, move them to the Student Resources module, and delete the module */
        canvas.getModuleItems(course.info.canvasOU, resourcesId, (getModuleItemsErr, moduleItems) => {
            if (getModuleItemsErr) {
                getResourcesContentsCallback(getModuleItemsErr, null);
                return;
            }
            /* send the moduleItems to the next function to see if the contents need to be moved into the student resources module or not */
            getResourcesContentsCallback(null, moduleItems);
        });
    }

    /*******************************************************************
     * moveResourcesContent()
     * Parameters: resourcesModuleItems, moveResourcesContentCallback
     * Move contents from Resources folder to Student Resources module
     *******************************************************************/
    function moveResourcesContent(reversedModuleItems, moveResourcesContentCallback) {
        /* if there is no resources module, or if it exists but is empty, move to the next function */
        if (typeof resourcesId === 'undefined' || resourcesId === -1 ||
            typeof reversedModuleItems === "undefined" || reversedModuleItems.length === 0) {

            course.message('The Resources module either doesn\'t exist, or is empty. No need to move its contents');
            moveResourcesContentCallback(null);
            return;
        }
        /* Array needs to be reversed for the PUT */
        resourcesModuleItems = reversedModuleItems.reverse();

        /* for each item in the resources module, move it to the student resources module */
        /* eachSeries helps avoid overloading the server */
        asyncLib.eachSeries(resourcesModuleItems, (moduleItem, eachLimitCallback) => {
            if (moduleItem.id === undefined) {
                moveResourcesContentCallback(null);
                return;
            }
            canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${resourcesId}/items/${moduleItem.id}`, {
                    'module_item': {
                        'module_id': welcomeModuleId,
                        'indent': 1,
                        'position': 1,
                        'new_tab': true,
                        'published': true
                    }
                },
                (putErr, item) => {
                    if (putErr) {
                        course.error(putErr);
                    } else {
                        course.message(`Successfully moved ${item.title} into the Welcome module from the Resources module`);
                    }

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

    /**************************************************************************
     * moveWelcomeContent()
     * Parameters: moveWelcomeContentCallback
     * Get module items from the welcome folder, sort the ones that 
     * belong under standard resources and send them to the next function, 
     * and move the rest of the content into the Student Resources module 
     **************************************************************************/
    function moveWelcomeContent(moveWelcomeContentCallback) {
        /* move everything to the 'Student Resources' folder
		if no welcome module exists, move to the next function */
        if (typeof welcomeModuleId === "undefined" || welcomeModuleId === -1) {
            moveWelcomeContentCallback(null, null, null);
            return;
        }

        var sortedIds = [];
        var count = 0;
        var standardResourcesOrder = [
            'University Policies',
            'Online Support Center',
            'Library Research Guide',
            'Library Research Guides',
            'Academic Support Center',
            'Copyright & Source Info',
            'Copyright and Source Info',
            'Copyright & Source Information',
            'Copyright and Source Information',
        ];

        /* get the module items from the welcome module */
        canvas.getModuleItems(course.info.canvasOU, welcomeModuleId, (getErr, reversedModuleItems) => {
            if (getErr) {
                moveWelcomeContentCallback(getErr, null, null);
                return;
            }
            /* Array needs to be reversed for the PUT */
            var moduleItems = reversedModuleItems.reverse();

            /* build an array that supports the required order found in the OCT course */
            for (var i = 0; i < standardResourcesOrder.length; i++) {
                for (var j = 0; j < moduleItems.length; j++) {
                    // found the item -> push and break out of inner loop
                    if (standardResourcesOrder[i].toLowerCase() === moduleItems[j].title.toLowerCase()) {
                        sortedIds.push(moduleItems[j].id);
                        break;
                    }
                }
            }

            /* for each item in the welcome module, move it to the student resources module */
            /* eachSeries helps avoid overloading the server */
            asyncLib.eachOfSeries(moduleItems, (moduleItem, key, eachCallback) => {
                /* check if it belongs in the Standard Resources subHeader. If not, set position
				to '1' to put under Supplemental Resources subHeader */
                if (!standardResourcesOrder.includes(moduleItem.title) && moduleItem.id !== undefined) {
                    canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items/${moduleItem.id}`, {
                        'module_item': {
                            'module_id': studentResourcesId,
                            'indent': 1,
                            'position': 1,
                            'new_tab': true,
                            'published': true,
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
                    moveWelcomeContentCallback(eachSeriesErr, null, null);
                    return;
                } else {
                    moveWelcomeContentCallback(null, sortedIds, count);
                }
            });
        });
    }

    /********************************************************************************
     * moveAdditionalWelcomeContents()
     * Parameters: itemOrders, count, moveStandardResourcesCallback
     * Move contents found in Welcome Folder that belong under the Standard Resources
     * subheader into Student Resources under the header, in the required order
     ********************************************************************************/
    function moveStandardResourcesContent(sortedIds, count, moveStandardResourcesCallback) {
        /* if no welcome module exists, move to the next function */
        if (typeof welcomeModuleId === 'undefined' || welcomeModuleId === -1 ||
            typeof studentResourcesId === 'undefined' || studentResourcesId === -1) {
            moveStandardResourcesCallback(null, null);
            return;
        }

        asyncLib.eachOfSeries(sortedIds, (id, key, eachOfSeriesCallback) => {
            /* go through and put every item in sortedIds (the part for required order portion) into the
			student resources module at position + 1 */
            canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items/${id}`, {
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
                moveStandardResourcesCallback(eachOfSeriesErr, null);
                return;
            } else {
                moveStandardResourcesCallback(null, count);
                return;
            }
        });
    }

    /**********************************************
     * createStandardResources()
     * Parameters: createStandardResourcesCallback
     * Creates text header "Standard Resources"
     **********************************************/
    function createStandardResources(count, createStandardResourcesCallback) {
        /* if no student resources module exists, move to the next function */
        if (typeof studentResourcesId === 'undefined' || studentResourcesId === -1) {
            moveStandardResourcesCallback(null, null);
            return;
        }
        /* create 'Standard Resources' text header */
        canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${studentResourcesId}/items`, {
                'module_item': {
                    'title': 'Standard Resources',
                    'type': 'SubHeader',
                    'position': count + 1 // put it just before University Policies activity
                }
            },
            (postErr) => {
                if (postErr) {
                    /* still try to move everything around! */
                    course.error(postErr);
                } else {
                    course.message('Successfully created Standard Resources text header');
                }
                createStandardResourcesCallback(null);
            });
    }

    /**************************************************
     * deleteModules()
     * Parameters: deleteModulesCallback
     * Deletes the now-empty modules that are not used
     **************************************************/
    function deleteModules(deleteModulesCallback) {
        /* if resources module exists, delete it */
        if (typeof resourcesId !== "undefined" && resourcesId !== -1) {
            canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${resourcesId}`, (deleteErr) => {
                if (deleteErr) {
                    course.error(deleteErr);
                } else {
                    course.message('Successfully deleted the Resources module');
                }
            });
        }

        /* if a welcome module exists, delete it */
        if (typeof welcomeModuleId !== "undefined" && welcomeModuleId !== -1) {
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
     * Creates text header "Standard Resources"
     **********************************************/
    function createSupplementalHeader(createSupplementalCallback) {
        /* create 'Supplemental Resources' text header */
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

    /******************************************************
     * moveStudentResourcesModule()
     * Parameters: moveCallback
     * Makes Student Resources the last module on the page
     ******************************************************/
    function moveStudentResourcesModule(moveCallback) {
        /* if no studentResources module exists, move to the next function */
        if (typeof studentResourcesId === "undefined" || studentResourcesId === -1) {
            moveCallback(null);
            return;
        }

        /* move 'Student Resources' to be the last module */
        canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${studentResourcesId}`, {
            'module': {
                /* add one to account for the added syllabus module */
                'position': modulesLength + 1,
                'published': true
            }
        }, (moveErr) => {
            if (moveErr) {
                moveCallback(moveErr);
                return;
            } else {
                course.message('Successfully made Student Resources the last module');
                moveCallback(null);
            }
        });
    }

    /*******************************************************************
     * welcomeFolder()
     * Parameters: none
     * Waterfall through the functions above. Functions are written in 
     * order from the ones located at the top of the page to the bottom.
     *******************************************************************/
    function welcomeFolder() {
        /* the functions to waterfall through */
        var myFunctions = [
            getModuleIds,
            makeStudentResourcesModule,
            getResourcesContents,
            moveResourcesContent,
            moveWelcomeContent,
            moveStandardResourcesContent,
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