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

function testGradientDescent(isOnline, weightCount, done) {
    var i;
    var builder = new KernelBuilder('gradientDescent');

    for (i = 0; i < weightCount; i++) {
        builder.args.add('global float*', 'gradients', new ArgIndex(i), 'gradient');
        builder.args.add('global float*', 'weights', new ArgIndex(i), 'weight');
        builder.args.add('global float*', 'deltas', new ArgIndex(i), 'delta');
    }

    if (isOnline) {
        builder.args.add('float', 'iterationCount');
    }

    builder.args.add('float', 'gdMomentum');
    builder.args.add('float', 'gdRate');

    builder.options.gradientDescent = {
        isOnline: isOnline,
        smoothing: false,
        momentum: 0.8,
        rate: 0.1
    };

    builder.template =
        'kernel void {{kernelName}}({{args.signatures}}) {\n' +
        codeTemplates.gradientDescent() +
        '}';

    var source = builder.source;

    console.log(source);

    assert(_.isString(source) && source.length > 0);

    done();
}

describe('KernelBuilder and KernelLauncher', function () {
    it('should compute online gradient descent', function (done) {
        testGradientDescent(true, 5, done);
    });

    it('should compute offline gradient descent', function (done) {
        testGradientDescent(true, 4, done);
    });
});
