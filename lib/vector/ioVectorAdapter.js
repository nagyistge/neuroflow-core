"use strict";
let util = require("util");
let VectorAdapter = require("./vectorAdapter");
let assert = require("assert");

function IOVectorAdapter(nContext, inputSize, outputSize) {
    assert(inputSize > 0, "Input size is invalid.");
    assert(outputSize > 0, "Output size is invalid.");

    VectorAdapter.call(this, nContext);

    this.inputSize = inputSize;
    this.outputSize = outputSize;
}

util.inherits(IOVectorAdapter, VectorAdapter);

module.exports = IOVectorAdapter;
