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

function testGradientDescent(isOnline, weightCount, useCache, done) {
    var i, j;
    var builder = new KernelBuilder('gradientDescent');
    var buffSize = 10;
    var ocl = testHelpers.createOCLStuff();
    var data = [];

    for (i = 0; i < weightCount; i++) {
        for (j = 0; j < 2; j++) { // Simulating multiple inputs
            builder.args.add('global float*', 'gradients', new ArgIndex(j, i), 'gradient');
            builder.args.add('uint', 'gradientsSize', new ArgIndex(j, i), 'size');
            builder.args.add('global float*', 'weights', new ArgIndex(j, i), 'weight');
            builder.args.add('global float*', 'deltas', new ArgIndex(j, i), 'delta');
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

    var launcher = builder.build(ocl.context, useCache).then(
        function(launcher) {
            assert(launcher ? true : false);
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
