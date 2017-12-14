# Child Module Development Commands

A few different commands are available to make developing your child module as easy as possible. These are used in the console when you are in your child module.

### npm start <1-4>

This command runs your child module. Use this when you want to see if your module runs.

Giving it a number between 1 and 4 designates which gauntlet it will run on. Giving it an invalid number will exit out of it with an error message. Giving it nothing will default to gauntlet 1.

### npm test

This command runs your child module on **all four gauntlets**. After it runs it through all four, it takes the results and runs them through the tests you have written in `Tests/childTests.js`.

You can view your code coverage in the console after the tests have completed.

### npm start -- update d2l

Run this command the first time you set up your child module project. This will update the gauntlet courses used in running your module. They are stored locally for `preImport` tests, and so you can have a course object when running `postImport` modules.
