/*global it,describe*/
"use strict";

var ncore = require("../");
var KernelBuilder = ncore.programs.KernelBuilder;
var KernelLauncher = ncore.programs.KernelLauncher;
var ArgIndex = ncore.programs.ArgIndex;
var codeTemplates = ncore.programs.codeTemplates;
var _ = require("lodash");
var assert = require("assert");
var testHelpers = require("./testHelpers");
var nooocl = require("nooocl");
var CLBuffer = nooocl.CLBuffer;
var ref = require("ref");
var float = ref.types.float;
var async = ncore.utils.task.async;
var NDRange = nooocl.NDRange;

var testGradientDescent = async(function* (isOnline, weightCount, useCache) {
    var builder = new KernelBuilder("gradientDescent", "single");
    var gradientsLength = 15;
    var ocl = testHelpers.createOCLStuff();
    var data = [];
    var iterationCount = isOnline ? 1 : 10;
    var momentum = 0.8;
    var rate = 0.01;

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
                gradients: CLBuffer.wrap(ocl.context, testHelpers.createFilledBuffer(float, gradientsLength, gradientValue)),
                weights: CLBuffer.wrap(ocl.context, testHelpers.createFilledBuffer(float, gradientsLength, weightValue)),
                deltas: CLBuffer.wrap(ocl.context, testHelpers.createZeroedBuffer(float, gradientsLength))
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

    var source = builder.source;

    assert(_.isString(source) && source.length > 0);

    try {
        var launcher = yield builder.build(ocl.context, useCache);
        assert(launcher instanceof KernelLauncher);

        // Set args:
        if (!isOnline) {
            launcher.setArg("iterationCount", iterationCount);
        }

        launcher.setArg("gdMomentum", 1, momentum);
        launcher.setArg("gdRate", rate);

        var x = 0;
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
        ocl.queue.enqueueNDRangeKernel(launcher.kernel, new NDRange(gradientsLength * float.size - (gradientsLength / 4)));

        // Verify:
        x = 0;
        for (let i = 0; i < weightCount; i++) {
            for (let j = 0; j < 2; j++) { // Simulating multiple inputs
                let dataItem = data[x++];
                let wOut = {}, dOut = {};
                ocl.queue.enqueueMapBuffer(dataItem.deltas, ocl.host.cl.defs.CL_MAP_READ, 0, gradientsLength * float.size, dOut);
                yield ocl.queue.waitable().enqueueMapBuffer(dataItem.weights, ocl.host.cl.defs.CL_MAP_READ, 0, gradientsLength * float.size, wOut).promise;
                try {
                    let deltas = ref.reinterpret(dOut.ptr, gradientsLength * float.size, 0);
                    let weights = ref.reinterpret(wOut.ptr, gradientsLength * float.size, 0);

                    for (let widx = 0; widx < gradientsLength; widx++) {
                        let w = float.get(weights, widx * float.size);
                        let d = float.get(deltas, widx * float.size);

                        assert(testHelpers.dEq(w - d, dataItem.weightValue));
                        assert(testHelpers.dEq((dataItem.gradientValue * rate) / iterationCount, d));
                    }
                }
                finally {
                    yield ocl.queue.waitable().enqueueUnmapMemory(dataItem.weights, wOut.ptr).promise;
                }
            }
        }
    }
    catch (e) {
        //console.log(source);
        throw e;
    }
});

describe("KernelBuilder and KernelLauncher", function () {
    it("should compute online gradient descent", function (done) {
        testGradientDescent(true, 2, false).nodeify(done);
    });

    it("should compute offline gradient descent", function (done) {
        testGradientDescent(false, 3, true).nodeify(done);
    });
});
