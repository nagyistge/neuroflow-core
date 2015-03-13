"use strict";
let util = require("util");
let IOVectorAdapter = require("./ioVectorAdapter");
let assert = require("assert");

function SupervisedVectorAdapter(nContext, inputSize, outputSize) {
    IOVectorAdapter.call(this, nContext, inputSize, outputSize);
}

util.inherits(SupervisedVectorAdapter, IOVectorAdapter);

module.exports = SupervisedVectorAdapter;
