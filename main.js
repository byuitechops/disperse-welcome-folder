/*eslint-env node, es6*/
/*eslint no-console:1*/

/* Module Description */

/* Put dependencies here */

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
     * Parameters: course object, functionCallback
     **********************************************/
    function makeStudentResourcesModule(course, functionCallback) {
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
                course.message(`Successfully created Student Resources module. SR ID: ${module.id}`);
                //the update module call in the canvas api requires the endpoint module id
                studentResourcesId = module.id;
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
    function createSupplementalHeader(course, functionCallback) {
        //create Supplemental Resources text header
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
                functionCallback(null, course);
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
        var topics = [
            'University Policies',
            'Online Support Center',
            'Library Research Guides',
            'Academic Support Center',
            'Copyright & Source Information',
            'Copyright and Source Information'
        ];

        //get the welcome module contents
        canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}/items`, (getErr, moduleItems) => {
            if (getErr) {
                functionCallback(getErr);
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
                        eachLimitCallback(null, course);
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
                        eachLimitCallback(null, course);
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

    /**********************************************
     * deleteWelcomeModule()
     * Parameters: course object, functionCallback
     **********************************************/
    function deleteWelcomeModule(course, functionCallback) {
        canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${welcomeModuleId}`, (deleteErr, results) => {
            if (deleteErr) {
                functionCallback(deleteErr);
                return;
            } else {
                course.message('Successfully deleted the welcome folder');
                functionCallback(null, course);
            }
        });
    }

    /**********************************************
     * moveStudentResourcesModule()
     * Parameters: course object, moveCallback
     **********************************************/
    function moveStudentResourcesModule(course, moveCallback) {
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
            createSupplementalHeader,
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


    /********************************
     *          STARTS HERE         *
     ********************************/
    //Get module IDs since the course object does not come with a list of modules
    canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules`, (getErr, moduleList) => {
        var manifest;
        if (getErr) {
            course.error(getErr);
            return;
        } else {

            manifest = course.content.find(file => {
                return file.name == 'imsmanifest.xml';
            });

            modulesLength = manifest.dom('organization>item').length;

            course.message(`There are ${modulesLength} in the manifest.`);
            course.message(`Successfully retrieved ${moduleList.length} modules.`);

            //loop through list of modules and get the IDs
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
                course.warning('Welcome folder doesn\'t exist. Moving on...');
                stepCallback(null, course);
            } else {
                //check to see if Student Resources module exists. if not, call a function to create one
                if (studentResourcesId <= -1) {
                    makeStudentResourcesModule(course, (postErr, course) => {
                        if (postErr) {
                            course.error(postErr);
                            stepCallback(null, course);
                            return;
                        }
                        //call function to move welcome folder contents to student resources modules
                        welcomeFolder(course, (welcomeErr, course) => {
                            if (welcomeErr) {
                                //err handling here
                                course.error(welcomeErr);
                                stepCallback(null, course);
                                return;
                            }
                            course.message('disperse-welcome-folder successfully completed.');
                            stepCallback(null, course);
                        });
                    });
                }
            }
        }
    });
}