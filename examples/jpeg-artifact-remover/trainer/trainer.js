"use strict";
var ncore = require("../../../index");
var task = ncore.utils.task;
var LookForFiles = require("./lookForFiles");

function Trainer(options) {
    this.options = options;
}

Trainer.prototype.begin = function () {
    let self = this;
    let inputPath = this.options.i;
    if (!inputPath) {
        console.error("Input path option (i|input) expected.");
        return false;
    }

    // Training start here:
    console.log("Training started.");

    let f = task.async(function*() {
        console.log("Searching for input files at location: " + inputPath);
        let lookForFiles = new LookForFiles(inputPath);
        let files = yield lookForFiles.searchForFiles();
        if (files.length) {
            console.log(`Found ${files.length} files.`);
        }
        else {
            console.warn("No input files found, training cannot continue.");
        }


    });

    f().catch(function (ex) {
        console.error("Trainer has been crashed.");
        console.error(ex.stack);
    });

    return true;
};

module.exports = Trainer;