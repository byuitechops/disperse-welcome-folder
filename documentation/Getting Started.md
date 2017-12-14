# Getting Started

There's a few easy things you have to do to get started on your child module.

1. Create a new repository on Github. Name it after what your child module does in all lower-case letters, with dashes instead of spaces. Example: "delete-duplicate-files"

2. Use `git clone <repository url>` to clone the repository to your computer. Then use `cd <repository-name>` to move into it in the commandline.

3. Download the child template repository **as a zip file** by pressing the "Clone or Download" button (or just click [this](https://github.com/byuitechops/child-template/archive/master.zip)).

4. Copy all of the contents out of it and paste them into your empty, newly cloned repository for your child module.

5. Run `npm install` on your child module's repository.

6. Copy/Paste your `auth.json` file from another repository into your child repository, or ask Zach, Daniel, or Ben for help in creating one.

7. Run the command `npm start -- update` in your child repository. Follow the prompt to complete it.

8. Open `package.json` in your editor and change all references to `child-template` with the name of your child module, exactly as you named the github repository.

9. In `package.json`, set the `childType` property to either `preImport` or `postImport`, whichever your child module will be.

10. Open `.gitignore` in your editor and add `documentation/` and to the list. It is not ignored so it will be available when you download the template, but we don't want this on every child module.

10. Push your child module repository to Github, and confirm it pushed correctly.

11. Open `main.js` in your editor and go ham. `main.js` is where your child module code will live. Use the command described below to run and test your module.

*Note:* Please do not change the name of your `main.js`, since the Child Development Kit refers to it directly.

## The Commands You Need To know

**`npm start`** : This command runs your child module in the child development environment.

All that means is that it provides everything your module needs to run. For `preImport` modules, it gives them a course object built from the Gauntlet D2L courses you downloaded earlier with `npm start -- update`. It also allows you to use different functions, like `course.success()` during development. And it gives you a valid course, so you can see if your module is actually working.

For `postImport` modules, it creates a clone of the Canvas Gauntlet and runs your child module on it. That way you don't make any actual changes to the pristine gauntlet on Canvas. It does mean running `npm start` or `npm test` may take a bit longer.

**`npm test`** : Runs your module against *all four* gauntlets. It includes whatever tap tests you've written in your `/Tests` folder as well. If you just want to see if your module even runs, use `npm start`. If you've finished writing it and want to test it, use `npm test`.
