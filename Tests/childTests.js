/*eslint-env node, es6*/

/* Dependencies */
const tap = require('tap');

function g1Tests(course, callback) {
    // Tap tests for Gauntlet 1 go here
    tap.pass('Success! Wheee! 1');
    // tap.fail('YOLO');
    callback(null, course);
}

module.exports = [
        {
            gauntlet: 1,
            tests: g1Tests
        }
];
