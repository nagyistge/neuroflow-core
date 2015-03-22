"use strict";

let nooocl = require("nooocl");
let CLContext = nooocl.CLContext;
let CLHost = nooocl.CLHost;
let CLCommandQueue = nooocl.CLCommandQueue;
let assert = require("assert");
let _ = require("lodash");
let ncore = require("../");
let async = ncore.utils.task.async;
let NContext = ncore.NContext;

let testHelpers = {
    doTest: async(function*(testFunc) {
        yield testHelpers._doTest("cpu", "single", testFunc);
        yield testHelpers._doTest("cpu", "double", testFunc);
        yield testHelpers._doTest("gpu", "single", testFunc);
        yield testHelpers._doTest("gpu", "double", testFunc);
    }),
    _doTest: async(function*(deviceHint, precision, testFunc) {
        let nContext = new NContext(deviceHint, precision, { useFileCache: true });
        yield testFunc(nContext);
    }),
    createFilledBuffer: function (type, size, value) {
        let buff = new Buffer(size * type.size);
        for (let i = 0; i < size; i++) {
            type.set(buff, i * type.size, value);
        }
        return buff;
    },
    createZeroedBuffer: function (type, size) {
        let buff = new Buffer(size * type.size);
        buff.fill(0);
        return buff;
    },
    dEq: function (v1, v2) {
        return Math.abs(v1 - v2) < 0.0001;
    }
};

module.exports = testHelpers;