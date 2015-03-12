"use strict";
let _ = require("lodash");
let assert = require("assert");
let KernelLauncher = require("./kernelLauncher");
let ArgSignature = require("./argSignature");

function ProgramLauncher(nContext) {
    assert(nContext instanceof require("../nContext"));

    this.nContext = nContext;
    this._argMap = new Map();
    this._parts = [];
}

ProgramLauncher.prototype.addPart = function(kernelLauncher, globalRange, localRange) {
    this._parts.push({
        launcher: kernelLauncher,
        globalRange: globalRange,
        localRange: localRange
    });
    for (let arg of kernelLauncher.args) {
        let to = this._argMap.get(arg.name);
        if (!to) {
            to = [];
            this._argMap.set(arg.name, to);
        }
        to.push(kernelLauncher);
    }
};

ProgramLauncher.prototype.setArg = function() {
    if (this._parts.length === 1) {
        for (let part of this._parts) {
            part.launcher.setArg(args.namePrefix, args.index, args.value);
        }
    }
    else {
        let args = KernelLauncher.parseArgs.apply(KernelLauncher, arguments);
        let argName = ArgSignature.createName(args.namePrefix, args.index);
        let launchers = this._argMap.get(argName);
        if (launchers) {
            for (let launcher of launchers) {
                launcher.setArg(args.namePrefix, args.index, args.value);
            }
        }
        else {
            throw new Error(`Argument '${argName}' not found.`);
        }
    }
};

ProgramLauncher.prototype.enqueue = function() {
    let q = this.nContext.clQueue;
    for (let part in this._parts) {
        q.enqueueNDRangeKernel(part.launcher.kernel, part.globalRange, part.localRange);
    }
};

module.exports = ProgramLauncher;