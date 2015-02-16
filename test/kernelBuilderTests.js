/*jslint node:true,nomen:true,vars:true,plusplus:true,white:true,unparam:true*/
/*jshint onevar:true*/
/*global it,describe*/
'use strict';

var nc = require('../');
var KernelBuilder = nc.ocl.KernelBuilder;
var ArgIndex = nc.ocl.ArgIndex;
var codeTemplates = nc.ocl.codeTemplates;
var _ = require('lodash');
var assert = require('assert');
var testHelpers = require('./testHelpers');
var nooocl = require('nooocl');
var CLBuffer = nooocl.CLBuffer;
var ref = require('ref');
var float = ref.types.float;

function createRndBuffer(size) {
    var i, buff = new Buffer(size * float.size);
    for (i = 0; i < size; i++) {
        float.set(buff, i * float.size, Math.random());
    }
    return buff;
}

function createZeroedBuffer(size) {
    return new Buffer(size * float.size);
}

function testGradientDescent(isOnline, weightCount, useCache, done) {
    var i, j, idx;
    var builder = new KernelBuilder('gradientDescent');
    var buffSize = 10;
    var ocl = testHelpers.createOCLStuff();
    var data = [];
    var iterationCount = 10;
    var momentum = 0.8;
    var rate = 0.1;

    for (i = 0; i < weightCount; i++) {
        for (j = 0; j < 2; j++) { // Simulating multiple inputs
            idx = new ArgIndex(j, i);
            builder.args.add('global float*', 'gradients', idx, 'gradient');
            builder.args.add('uint', 'gradientsSize', idx, 'size');
            builder.args.add('global float*', 'weights', idx, 'weight');
            builder.args.add('global float*', 'deltas', idx, 'delta');
            data.push({
                gradients: CLBuffer.wrap(ocl.context, createRndBuffer(buffSize)),
                weights: CLBuffer.wrap(ocl.context, createRndBuffer(buffSize)),
                deltas: CLBuffer.wrap(ocl.context, createZeroedBuffer(buffSize))
            });
        }
    }

    if (!isOnline) {
        builder.args.add('float', 'iterationCount');
    }

    builder.args.add('float', 'gdMomentum', new ArgIndex(1));
    builder.args.add('float', 'gdRate');

    builder.options.gradientDescent1 = {
        isOnline: isOnline,
        smoothing: false,
        gradientCategories: 'gradient',
        gradientsSizeArgNamePrefix: 'gradientsSize',
        weightsArgNamePrefix: 'weights',
        deltasArgNamePrefix: 'deltas',
        gdMomentumArgIndex: new ArgIndex(1)
    };

    builder.template =
        'kernel void {{kernelName}}({{args.signatures}}) {\n' +
        codeTemplates.gradientDescent('gradientDescent1') +
        '}';

    var source = builder.source;

    assert(_.isString(source) && source.length > 0);

    builder.build(ocl.context, useCache).then(
        function(launcher) {
            assert(launcher ? true : false);

            // Set args:
            if (!isOnline) {
                builder.setArg('iterationCount', iterationCount);
            }

            builder.setArg('gdMomentum', new ArgIndex(1), momentum);
            builder.setArg('gdRate', rate);

            var x = 0, d;
            for (i = 0; i < weightCount; i++) {
                for (j = 0; j < 2; j++) { // Simulating multiple inputs
                    idx = new ArgIndex(j, i);
                    d = data[x++];
                    builder.setArg('gradients', idx, d.gradients);
                    builder.setArg('gradientsSize', idx, buffSize);
                    builder.setArg('weights', idx, d.weights);
                    builder.setArg('deltas', idx, d.deltas);
                }
            }

            // Invoke:

        })
        .catch(function(e) {
            console.log(source);
            throw e;
        })
        .nodeify(done);
}

describe('KernelBuilder and KernelLauncher', function () {
    it('should compute online gradient descent', function (done) {
        testGradientDescent(true, 2, false, done);
    });

    it('should compute offline gradient descent', function (done) {
        testGradientDescent(false, 3, true, done);
    });
});
