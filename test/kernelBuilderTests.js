/*global it,describe*/
"use strict";

let ncore = require("../");
let KernelBuilder = ncore.programs.KernelBuilder;
let KernelLauncher = ncore.programs.KernelLauncher;
let ArgIndex = ncore.programs.ArgIndex;
let codeTemplates = ncore.programs.codeTemplates;
let _ = require("lodash");
let assert = require("assert");
let testHelpers = require("./testHelpers");
let nooocl = require("nooocl");
let CLBuffer = nooocl.CLBuffer;
let ref = require("ref");
let async = ncore.utils.task.async;
let NDRange = nooocl.NDRange;

let testGradientDescent = async(function* (isOnline, weightCount, useCache) {
    yield testHelpers.doTest(async(function*(nContext) {
        let real = ref.coerceType(nContext.realType);
        let builder = new KernelBuilder("ut_gradientDescent" + (isOnline ? "_on" : "_off"), nContext.options.precision);
        let gradientsLength = 15;
        let data = [];
        let iterationCount = isOnline ? 1 : 10;
        let momentum = 0.8;
        let rate = 0.01;

        for (let i = 0; i < weightCount; i++) {
            for (let j = 0; j < 2; j++) { // Simulating multiple inputs
                let idx = new ArgIndex(j, i);
                builder.args.add("global real*", "gradients", idx, "gradient");
                builder.args.add("uint", "gradientsSize", idx, "size");
                builder.args.add("global real*", "weights", idx, "weight");
                builder.args.add("global real*", "deltas", idx, "delta");
                let gradientValue = Math.random();
                let weightValue = Math.random();
                data.push({
                    gradientValue: gradientValue,
                    weightValue: weightValue,
                    gradients: CLBuffer.wrap(nContext.clContext, testHelpers.createFilledBuffer(real, gradientsLength, gradientValue)),
                    weights: CLBuffer.wrap(nContext.clContext, testHelpers.createFilledBuffer(real, gradientsLength, weightValue)),
                    deltas: CLBuffer.wrap(nContext.clContext, testHelpers.createZeroedBuffer(real, gradientsLength))
                });
            }
        }

        if (!isOnline) {
            builder.args.add("real", "iterationCount");
        }

        builder.args.add("real", "gdMomentum", new ArgIndex(1));
        builder.args.add("real", "gdRate");

        builder.options.gradientDescent1 = {
            isOnline: isOnline,
            smoothing: false,
            gradientCategories: "gradient",
            gradientsSizeArgNamePrefix: "gradientsSize",
            weightsArgNamePrefix: "weights",
            deltasArgNamePrefix: "deltas",
            gdMomentumArgIndex: new ArgIndex(1)
        };

        builder.template =
            "kernel void {{kernelName}}({{args.signatures}}) {\n" +
            codeTemplates.gradientDescent("gradientDescent1") +
            "}";

        let source = builder.source;

        assert(_.isString(source) && source.length > 0);

        let launcher = yield builder.build(nContext.clContext, useCache);
        assert(launcher instanceof KernelLauncher);

        // Set args:
        if (!isOnline) {
            launcher.setArg("iterationCount", iterationCount);
        }

        launcher.setArg("gdMomentum", 1, momentum);
        launcher.setArg("gdRate", rate);

        let x = 0;
        for (let i = 0; i < weightCount; i++) {
            for (let j = 0; j < 2; j++) { // Simulating multiple inputs
                let idx = new ArgIndex(j, i);
                let d = data[x++];
                launcher.setArg("gradients", idx, d.gradients);
                launcher.setArg("gradientsSize", idx, gradientsLength);
                launcher.setArg("weights", idx, d.weights);
                launcher.setArg("deltas", idx, d.deltas);
            }
        }

        // Invoke:
        nContext.clQueue.enqueueNDRangeKernel(launcher.kernel, new NDRange(gradientsLength * real.size - (gradientsLength / 4)));

        // Verify:
        x = 0;
        for (let i = 0; i < weightCount; i++) {
            for (let j = 0; j < 2; j++) { // Simulating multiple inputs
                let dataItem = data[x++];
                let wOut = {}, dOut = {};
                nContext.clQueue.enqueueMapBuffer(dataItem.deltas, nContext.clHost.cl.defs.CL_MAP_READ, 0, gradientsLength * real.size, dOut);
                yield nContext.clQueue.waitable().enqueueMapBuffer(dataItem.weights, nContext.clHost.cl.defs.CL_MAP_READ, 0, gradientsLength * real.size, wOut).promise;
                try {
                    let deltas = ref.reinterpret(dOut.ptr, gradientsLength * real.size, 0);
                    let weights = ref.reinterpret(wOut.ptr, gradientsLength * real.size, 0);

                    for (let widx = 0; widx < gradientsLength; widx++) {
                        let w = real.get(weights, widx * real.size);
                        let d = real.get(deltas, widx * real.size);

                        assert(testHelpers.dEq(w - d, dataItem.weightValue), `${widx}:  ${w - d} !== ${dataItem.weightValue}`);
                        assert(testHelpers.dEq((dataItem.gradientValue * rate) / iterationCount, d), `${widx}:  ${(dataItem.gradientValue * rate) / iterationCount} !== ${d}`);
                    }
                }
                finally {
                    yield nContext.clQueue.waitable().enqueueUnmapMemory(dataItem.weights, wOut.ptr).promise;
                }
            }
        }
    }));
});

describe("KernelBuilder and KernelLauncher", function () {
    it("should compute online gradient descent", function (done) {
        testGradientDescent(true, 3, false).nodeify(done);
    });

    it("should compute offline gradient descent", function (done) {
        testGradientDescent(false, 4, true).nodeify(done);
    });
});
