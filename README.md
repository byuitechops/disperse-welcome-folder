# Disperse Welcome Folder
### Package Name: disperse-welcome-folder
### Child Type: post import

This child module is built to be used by the Brigham Young University - Idaho D2L to Canvas Conversion Tool. It utilizes the standard `module.exports => (course, stepCallback)` signature and uses the Conversion Tool's standard logging functions.

## Purpose

The main purpose of this child module is to move the contents out of the Welcome module into the Student Resources module. Once the Welcome module is empty, it is then deleted from the course.

* "How to Understand Due Dates" instructions gets deleted during execution.
* "Standard Resources" and "Course Specific" headers are created inside the Student Resources module.
* The Student Resources are modeled after the OCT course on Canvas.


## Process

Describe in steps how the module accomplishes its goals.

1. Get the module list and check if there is a 'Welcome' module:
	- If there is a 'Welcome' module, continue with the child module
	- If not, end the child module
2. Check to see if a 'Student Resources' module exists:
	- If there is a 'Student Resources' module, don't create a new one
	- If there is not one, create one
3. Create a 'Standard Resources' sub-module to move contents to from the 'Welcome' module
4. Create a 'Supplementatl Resources' sub-module to move contents to from the 'Welcome' module
5. If the 'How to Understand Due Dates' module item exists, delete it
6. Move the contents from the 'Welcome' module into the 'Student Resources' module
7. Delete the 'Welcome' module
8. Move the 'Student Resources' module to be the last module


## Authors
* Seth Childers
* Sam McGrath