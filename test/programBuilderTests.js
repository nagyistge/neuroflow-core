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
let ref = require("ref");
let double = ref.types.double;
let nooocl = require("nooocl");
let CLBuffer = nooocl.CLBuffer;

const addKernelCode = fs.readFileSync(path.join(__dirname, "kernels/add.cl"), "utf8");
const multiplyKernelCode = fs.readFileSync(path.join(__dirname, "kernels/multiply.cl"), "utf8");

describe("ProgramBuilder", function () {
    it("should combine two kernels whose are sharing some arguments", function (done) {
        testHelpers.doTest(async(function*(nContext) {
            let real = ref.coerceType(nContext.realType);
            let buffSize = 100;
            let buffArg = new ArgSignature("global real*", "values");
            let multiplierArg = new ArgSignature("real", "multiplier");
            let additionArg = new ArgSignature("real", "addition");
            let sizeArg = new ArgSignature("uint", "size");
            let programBuilder = new ProgramBuilder(nContext, "utCombinationOfTwoKernels");
            let buffer = new Buffer(real.size * buffSize);
            for (let i = 0; i < buffSize; i++) {
                real.set(buffer, i * real.size, i * 1.1);
            }
            let clBuffer = CLBuffer.wrap(nContext.clContext, buffer);

            // Define add:
            programBuilder.addPart({
                kernelName: "add",
                args: [buffArg, additionArg, sizeArg],
                template: addKernelCode,
                globalSize: buffSize
            });

            // Define mul:
            programBuilder.addPart({
                kernelName: "multiply",
                args: [buffArg, multiplierArg, sizeArg],
                template: multiplyKernelCode,
                globalSize: buffSize / 2
            });

            var programLauncher = yield programBuilder.build();
            programLauncher.setArg("values", clBuffer);
            programLauncher.setArg("multiplier", 2);
            programLauncher.setArg("addition", 55.11);
            programLauncher.setArg("size", buffSize);
            programLauncher.enqueue();

            let out = {};
            yield nContext.clQueue.waitable().enqueueMapBuffer(clBuffer, nContext.clHost.cl.defs.CL_MAP_READ, 0, clBuffer.size, out).promise;
            try {
                for (let i = 0; i < buffSize; i++) {
                    let v = real.get(buffer, i * real.size);
                    let t = (i * 1.1 + 55.11) * 2;
                    assert(testHelpers.dEq(v, t), `${i}: ${v} !== ${t}`);
                }
            }
            finally {
                yield nContext.clQueue.waitable().enqueueUnmapMemory(clBuffer, out.ptr).promise;
            }
        })).nodeify(done);
    });
});
