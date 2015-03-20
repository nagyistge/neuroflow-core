/*global it,describe*/
"use strict";

let ncore = require("../");
let ProgramBuilder = ncore.programs.ProgramBuilder;
let async = ncore.utils.task.async;
let _ = require("lodash");
let assert = require("assert");
let testHelpers = require("./testHelpers");
let ArgSignature = ncore.programs.ArgSignature;
let NContext = ncore.NContext;
let fs = require("fs");
let path = require("path");

const addKernelCode = fs.readFileSync(path.join(__dirname, "kernels/add.cl"), "utf8");
const multiplyKernelCode = fs.readFileSync(path.join(__dirname, "kernels/multiply.cl"), "utf8");

describe("ProgramBuilder", function () {
    it("should combine two kernels whose are sharing some arguments", function (done) {
        let doIt = async(function*() {
            let buffSize = 100;
            let buffArg = new ArgSignature("global float*", "values");
            let multiplierArg = new ArgSignature("float", "multiplier");
            let additionArg = new ArgSignature("float", "addition");
            let nContext = new NContext("CPU");
            let programBuilder = new ProgramBuilder(nContext, "utCombinationOfTwoKernels");

            // Define add:
            programBuilder.addPart({
                args: [buffArg, additionArg],
                template: addKernelCode,
                globalSize: buffSize
            });

            // Define mul:
            programBuilder.addPart({
                args: [buffArg, multiplierArg],
                template: multiplyKernelCode,
                globalSize: buffSize / 2
            });

            var programLauncher = yield programBuilder.build();
        });

        doIt().nodeify(done);
    });
});
