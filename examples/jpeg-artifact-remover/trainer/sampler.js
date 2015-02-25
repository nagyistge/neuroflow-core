"use strict";
var ncore = require("../../../index");
var task = ncore.utils.task;
var _ = require("lodash");

function Sampler(files, options) {
    this.files = files;
    this.options = options;
}

Sampler.prototype.generateFFSample = task.async(function*() {
    let percent = _.random(1, 100);
    let file = this.files[_.random(0, this.files.length - 1)];
});

module.exports = Sampler;
