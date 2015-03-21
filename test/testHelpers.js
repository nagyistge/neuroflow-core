'use strict';

var nooocl = require('nooocl');
var CLContext = nooocl.CLContext;
var CLHost = nooocl.CLHost;
var CLCommandQueue = nooocl.CLCommandQueue;
var assert = require('assert');
var _ = require('lodash');

var testHelpers = {
    createOCLStuff: function () {
        var host = CLHost.createV11();
        assert(_.isObject(host));
        var platforms = host.getPlatforms();
        assert(_.isArray(platforms));
        assert.notEqual(platforms.length, 0);
        var devices = platforms[0].cpuDevices();
        assert(_.isArray(devices));
        assert.notEqual(devices.length, 0);
        var device = devices[0];
        var context = new CLContext(device);
        return {
            host: host,
            device: device,
            context: context,
            queue: new CLCommandQueue(context, device)
        };
    },
    createFilledBuffer: function (type, size, value) {
        var i, buff = new Buffer(size * type.size);
        for (i = 0; i < size; i++) {
            type.set(buff, i * type.size, value);
        }
        return buff;
    },
    createZeroedBuffer: function (type, size) {
        var buff = new Buffer(size * type.size);
        buff.fill(0);
        return buff;
    },
    dEq: function (v1, v2) {
        return Math.abs(v1 - v2) < 0.0001;
    }
};

module.exports = testHelpers;