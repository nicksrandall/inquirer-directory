/**
 * Directory prompt example
 */

"use strict";
var inquirer = require("inquirer");
inquirer.registerPrompt('directory', require('./index'));

inquirer.prompt([
  {
    type: "directory",
    name: "path",
    message: "In what directory would like to perform this action?",
    basePath: "./node_modules"
  }
], function( answers ) {
  console.log( JSON.stringify(answers, null, "  ") );
});
