'use strict';

var nooocl = require('nooocl');
var CLContext = nooocl.CLContext;
var CLHost = nooocl.CLHost;
var assert = require('assert');
var _ = require('lodash');

var testHelpers = {
    createOCLStuff: function() {
        var host = CLHost.createV11();
        assert(_.isObject(host));
        var platforms = host.getPlatforms();
        assert(_.isArray(platforms));
        assert.notEqual(platforms.length, 0);
        var devices = platforms[0].allDevices();
        assert(_.isArray(devices));
        assert.notEqual(devices.length, 0);
        var device = devices[0];
        var context = new CLContext(device);
        return {
            host: host,
            device: device,
            context: context
        };
    }
};

module.exports = testHelpers;