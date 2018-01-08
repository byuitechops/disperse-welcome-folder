/*eslint-env node, es6*/

/* Module Description */

/* Put dependencies here */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

/* View available course object functions */
// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

/**********************************************
* makeStudentResourcesModule()
* Parameters: course object
**********************************************/
function makeStudentResourcesModule(course) {
    var id = 0;

    course.success(`disperse-welcome-folder`,
                   `No Student Resources folder. About to create one.`);

    //create the module
    canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules`,
        { 'module[name]' : 'Student Resources' },
        (postErr, module) => {
        if (postErr) {
            course.throwErr(`disperse-welcome-folder`, postErr);
            return;
        } else {
            id = module.id;
            course.success(`disperse-welcome-folder`,
                           `Successfully created Student Resources module. SR ID: ${id}`);
        }
    });

    //the update module call in the canvas api requires the endpoint module id
    return id;
}

/**********************************************
* createSRHeader()
* Parameters: course object, student resources id
**********************************************/
function createSRHeader(course, sr_id) {
    //create Standard Resources text header
    canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${sr_id}/items`),
            {
                `module_item[title]` : `Standard Resources`,
                `module_item[type]` : `SubHeader`
            },
            (postErr, results) => {
                if (postErr) {
                    course.throwErr(`disperse-welcome-folder`, postErr);
                    return;
                } else {
                    course.success(`disperse-welcome-folder`, `Successfully created Standard Resources text header`);
                }
            };
}

/**********************************************
* deleteUnderstandDueDatesPage()
* Parameters: course object, welcome id
**********************************************/
function deleteUnderstandDueDatesPage(course, welcome_id) {
    //delete "How to Understand Due Dates" if it exists
    canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules/${welcome_id}/items`, (getErr, module_items) => {
        if (getErr) {
            course.throwErr(`disperse-welcome-folder`, getErr);
            return;
        } else {
            course.success(`disperse-welcome-folder`,
                    `Successfully retrieved ${module_items.length} module items in Welcome Module`);
            asyncLib.each(module_items, (topic, cb) => {
                //Standard Naming Scheme: How to Understand Due Dates
                //Might have to use Regex to catch all possible scenarios
                if (topic.title == 'How to Understand Due Dates') {
                    canvas.delete(`/api/v1/courses/${course.info.canvasOU}/modules/${welcome_id}/items/${topic.id}`, (deleteErr, results) => {
                        if (deleteErr) {
                            course.throwErr(`disperse-welcome-module`, deleteErr);
                            return;
                        } else {
                            course.success(`disperse-welcome-module`, `Successfully deleted \"How to Understand Due Dates\"`);
                            cb(null);
                        }
                    });
                }
            });
        }
    });
}

function moveContents(course, welcome_id, sr_id) {
    //move everything to student resources folder
    //https://canvas.instructure.com/doc/api/modules.html#method.context_module_items_api.update
}

/*************************************************
* moveContents()
* Parameters: Course object, welcome module id,
* student resources id
*************************************************/
function welcomeFolder(course, welcome_id, sr_id) {
    //do async.waterfall here

}

module.exports = (course, stepCallback) => {
    /* Create the module report so that we can access it later as needed.
    This MUST be done at the beginning of each child module. */
    course.addModuleReport('disperse-welcome-folder');
    //ids for modules
    var welcome_course_id = -1;
    var student_resources_id = -1;

    //Get module IDs since the course object does not come with a list of modules
    canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules`, (getErr, module_list) => {
        if (getErr) {
            course.throwErr(`disperse-welcome-folder`, getErr);
            return;
        } else {
            course.success(`disperse-welcome-folder`, `Successfully retrieved modules list`);

            //loop through list of modules and get the IDs
            aysncLib.each(module_list, (module, callback) => {
                if (module.name == `Welcome`) {
                    welcome_course_id = module.id;
                }

                if (module.name == `Student Resources`) {
                    student_resources_id = module.id;
                }

                callback(null);
            });
        }
    }), (getErr) => {
        if (getErr) {
            course.throwErr(`disperse-welcome-folder`, getErr);
            return;
        } else {
            //end program if welcome_course_id == -1
            if (welcome_course_id == -1) {
                //move on to the next child module

                course.success('disperse-welcome-folder', 'welcome folder doesn\'t exist. moving on..');
                stepCallback(null, course);
            } else {
                //check to see if Student Resources module exists. if not, call a function to create one
                if (student_resources_id <= -1) {
                    student_resources_id = makeStudentResourcesModule(course);
                }

                //call function to move welcome folder contents to student resources modules
                welcomeFolder(course, welcome_course_id, student_resources_id);
                course.success('disperse-welcome-folder', 'disperse-welcome-folder successfully completed.');
                stepCallback(null, course);
            }
        }
    };
};
