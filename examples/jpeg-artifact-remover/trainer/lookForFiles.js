"use strict";
var walk = require("walk");
var ncore = require("../../../index");
var task = ncore.utils.task;
var path = require("path");

function LookForFiles(path) {
    this.path = path;
    this._walking = null;
}

LookForFiles.prototype.searchForFiles = task.async(function*() {
    if (this._walking) {
        return yield this._walking;
    }
    let walker = walk.walk(this.path, {followLinks: false});
    let result = [];
    this._walking = new Promise(function(resolve) {
        walker.on("file", function(root, fileStat, next) {
            if (path.extname(fileStat.name).toLowerCase() === ".png") {
                result.push({
                    root: root,
                    fileStat: fileStat
                });
            }
            next();
        });
        walker.on("end", function() {
            resolve(result);
        });
    });
    return yield this._walking;
});

module.exports = LookForFiles;
