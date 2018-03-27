/* Dependencies */
const tap = require('tap');
const canvas = require('canvas-wrapper');

module.exports = (course, callback) => {
    tap.test('child-template', (test) => {

        test.pass('potato');
        test.pass('tomato');
        test.fail('avacado');

        test.end();
    });

    callback(null, course);
};
