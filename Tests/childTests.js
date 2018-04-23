/* Dependencies */
const tap = require('tap');
const canvas = require('canvas-wrapper');
const asyncLib = require ('async');

module.exports = (course, callback) => {
    tap.test('disperse-welcome-folder', (test) => {

        var studentResourcesId = 0;

        function getModules(getModulesCallback) {
            /* Check if the modules have been deleted */
            canvas.getModules(course.info.canvasOU, (getModulesErr, moduleList) => {
                if (getModulesErr) {
                    getModulesCallback(getModulesErr);
                    return;
                } 
                moduleList.forEach(module => {
                    if (module.name === 'Welcome') {
                        test.fail('Welcome module still exists');
                    } else if (module.name === 'Resources') {
                        test.fail('Resources module still exists');
                    } else {
                        test.pass('No Welcome or Resources modules');
                    } 

                    if (module.name === 'Student Resources') {
                        studentResourcesId = module.id;
                    } 
                });
                getModulesCallback(null);
            });
        }

        function getItems(getItemsCallback) {
            /* Desired order of module items in Student Resources Module */
            var order = [
                'Supplemental Resources',
                'Orientation to Online Learning',
                'Discussion Forums',
                'Syllabus (PAGE)',
                'Syllabus (URL)',
                'Standard Resources',
                'University Policies',
                'Online Support Center',
                'Library Research Guide',
                'Academic Support Center',
                'Copyright and Source Information',
            ];

            /* Check Student Resources Module Item Order */
            canvas.getModuleItems(course.info.canvasOU, studentResourcesId, (getItemsErr, items) => {
                if (getItemsErr) {
                    getItemsCallback(getItemsErr);
                    return;
                }
                items.forEach((item, i) => {
                    if (item.title !== order[i]) {
                        test.fail('Module Item Order is not correct in Student Resources Module');
                    } else {
                        test.pass('Module item order is spot on!');
                    }
                });
                getItemsCallback(null);
            });
        }

        var myFunctions = [
            getModules,
            getItems,
        ];

        asyncLib.waterfall(myFunctions, (waterfallErr) => {
            if (waterfallErr) {
                test.end();
                return;
            }
            test.end();
        })
    });

    callback(null, course);
};
