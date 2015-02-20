/*global it,describe*/
"use strict";

var nc = require("../");
var KernelBuilder = nc.ocl.KernelBuilder;
var KernelLauncher = nc.ocl.KernelLauncher;
var ArgIndex = nc.ocl.ArgIndex;
var codeTemplates = nc.ocl.codeTemplates;
var _ = require("lodash");
var assert = require("assert");
var testHelpers = require("./testHelpers");
var nooocl = require("nooocl");
var CLBuffer = nooocl.CLBuffer;
var ref = require("ref");
var float = ref.types.float;
var async = nc.utils.task.async;
var NDRange = nooocl.NDRange;

function createFilledBuffer(size, value) {
    var i, buff = new Buffer(size * float.size);
    for (i = 0; i < size; i++) {
        float.set(buff, i * float.size, value);
    }
    return buff;
}

function createZeroedBuffer(size) {
    var buff = new Buffer(size * float.size);
    buff.fill(0);
    return buff;
}

var testGradientDescent = async(function* (isOnline, weightCount, useCache) {
    var builder = new KernelBuilder("gradientDescent");
    var gradientsLength = 15;
    var ocl = testHelpers.createOCLStuff();
    var data = [];
    var iterationCount = 10;
    var momentum = 0.8;
    var rate = 0.01;

    for (let i = 0; i < weightCount; i++) {
        for (let j = 0; j < 2; j++) { // Simulating multiple inputs
            let idx = new ArgIndex(j, i);
            builder.args.add("global float*", "gradients", idx, "gradient");
            builder.args.add("uint", "gradientsSize", idx, "size");
            builder.args.add("global float*", "weights", idx, "weight");
            builder.args.add("global float*", "deltas", idx, "delta");
            data.push({
                gradients: CLBuffer.wrap(ocl.context, createFilledBuffer(gradientsLength, 1.0)),
                weights: CLBuffer.wrap(ocl.context, createFilledBuffer(gradientsLength, 0.5 + i * 0.1 + j * 0.1)),
                deltas: CLBuffer.wrap(ocl.context, createZeroedBuffer(gradientsLength))
            });
        }
    }

    if (!isOnline) {
        builder.args.add("float", "iterationCount");
    }

    builder.args.add("float", "gdMomentum", new ArgIndex(1));
    builder.args.add("float", "gdRate");

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
        ocl.queue.enqueueNDRangeKernel(launcher.kernel, new NDRange(gradientsLength * float.size - (gradientsLength/ 4)));

        // Verify:
        x = 0;
        for (let i = 0; i < weightCount; i++) {
            for (let j = 0; j < 2; j++) { // Simulating multiple inputs
                let d = data[x++];
                let out = {};
                yield ocl.queue.waitable().enqueueMapBuffer(d.weights, ocl.host.cl.defs.CL_MAP_READ, 0, gradientsLength * float.size, out).promise;
                let weights = ref.reinterpret(out.ptr, gradientsLength * float.size, 0);
                let typedWeights = new Float64Array(gradientsLength);
                for (let widx = 0; widx < gradientsLength; widx++) {
                    typedWeights[widx] = float.get(weights, widx * float.size);
                }
                console.log(typedWeights);
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
