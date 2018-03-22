# Disperse Welcome Folder
### *Package Name*: disperse-welcome-folder
### *Child Type*: post import
### *Platform*: online
### *Required*: Recommended

This child module is built to be used by the Brigham Young University - Idaho D2L to Canvas Conversion Tool. It utilizes the standard `module.exports => (course, stepCallback)` signature and uses the Conversion Tool's standard logging functions. You can view extended documentation [Here](https://github.com/byuitechops/d2l-to-canvas-conversion-tool/tree/master/documentation).

## Purpose

The main purpose of this child module is to move the contents out of the Welcome module into the Student Resources module. Once the Welcome module is empty, it is then deleted from the course.

* "How to Understand Due Dates" instructions gets deleted during execution.
* "Standard Resources" and "Course Specific" headers are created inside the Student Resources module.
* The Student Resources are modeled after the OCT course on Canvas.

## How to Install

```
npm install disperse-welcome-folder
```

## Run Requirements

None

## Options

None

## Outputs

None

## Process

1. Get the module list and check if there is a 'Welcome' module:
	- If there is a 'Welcome' module, continue with the child module
	- If not, end the child module
    - Repeat step for 'Resources' module
2. Check to see if a 'Student Resources' module exists:
	- If there is a 'Student Resources' module, don't create a new one
	- If there is not one, create one
3. Create a 'Standard Resources' sub-module to move contents to from the 'Welcome' module
4. Create a 'Supplemental Resources' sub-module to move contents to from the 'Welcome' module
5. Move the contents from the 'Welcome' module into the 'Student Resources' module
6. Delete the 'Welcome' and 'Resources' modules 
7. Move the 'Student Resources' module to be the last module

## Log Categories

- Already Existing Module
- Items Moved from Resources Module to Student Resources Module
- Items Moved from Welcome Module to Supplemental Resources
- Items Moved from Welcome Module to Standard Resources
- Supplemental Resources Text Header Created
- Standard Resources Text Header Created

## Requirements

1. Create a Student Resources module
2. Disperse the contents of the Welome folder into the Student Resources module
3. If there is a Resources folder, disperse its contents into the Student Resources module
4. Delete the Welcome folder
5. Delete the Resources folder