"use strict";
let util = require("util");
let IOVectorAdapter = require("./ioVectorAdapter");
let assert = require("assert");

function SupervisedVectorAdapter(nContext, inputSize, outputSize) {
    IOVectorAdapter.call(this, nContext, inputSize, outputSize);
}

util.inherits(SupervisedVectorAdapter, IOVectorAdapter);

SupervisedVectorAdapter.prototype.enumerateInternalVectorInfos = function* () {
    for (let baseInfo of IOVectorAdapter.prototype.enumerateInternalVectorInfos.call(this)) {
        yield baseInfo;
    }
    yield {
        name: "desiredOutputs",
        size: this.outputSize,
        direction: "output"
    };
};

module.exports = SupervisedVectorAdapter;
