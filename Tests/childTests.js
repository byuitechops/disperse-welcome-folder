/*eslint-env node, es6*/

/* Dependencies */
const tap = require('tap');

function g1Tests(course, callback) {
    // Tap tests for Gauntlet 1 go here
    tap.pass('Success! Wheee! 1');
    // tap.fail('YOLO');
    callback(null, course);
}

function g2Tests(course, callback) {
    // Tap tests for Gauntlet 2 go here
    tap.pass('Success! Wheee! 2');
    callback(null, course);
}

function g3Tests(course, callback) {
    // Tap tests for Gauntlet 3 go here
    tap.pass('Success! Wheee! 3');
    callback(null, course);
}

function g4Tests(course, callback) {
    // Tap tests for Gauntlet 4 go here
    tap.pass('Success! Wheee! 4');
    callback(null, course);
}

module.exports = [
        {
            gauntlet: 1,
            tests: g1Tests
        },
        {
            gauntlet: 2,
            tests: g2Tests
        },
        {
            gauntlet: 3,
            tests: g3Tests
        },
        {
            gauntlet: 4,
            tests: g4Tests
        },
];
