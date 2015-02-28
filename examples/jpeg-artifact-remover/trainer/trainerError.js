"use strict";
var util = require("util");
var _ = require("lodash");

function TrainerError(message) {
    Error.call(this);
    Error.captureStackTrace(this, TrainerError);
    this.name = "TrainerError";
    this.message = message;
}

util.inherits(TrainerError, Error);

module.exports = TrainerError;
