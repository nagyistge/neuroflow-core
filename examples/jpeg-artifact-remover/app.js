"use strict";
var yargs = require("yargs")
    .usage("$0 [train|remove] <options ...>")
    .demand(1)
    .option("i", {
        alias: "input",
        describe: "path of the folder containing of the input png files",
        type: "string"
    })
    .options("c", {
        alias: "count",
        describe: "training samples count",
        type: "number",
        default: 5000
    });

var argv = yargs.argv;
var _ = require("lodash");

var command = _.first(argv._);
switch (command) {
    case "train":
        var Trainer = require("./trainer/trainer");
        if (!new Trainer(argv).begin()) {
            yargs.showHelp();
        }
        break;
    default :
        yargs.showHelp();
        break;
}