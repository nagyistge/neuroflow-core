"use strict";
var Args = require("args-js");
var nooocl = require("nooocl");
var CLHost = nooocl.CLHost;
var CLError = nooocl.CLError;
var CLContext = nooocl.CLContext;
var CLCommandQueue = nooocl.CLCommandQueue;

function* enumAvailableDevices(host, type) {
    for (let platform of host.getPlatforms()) {
        try {
            for (let device of platform.getDevices(type)) {
                yield device;
            }
        }
        catch (e) {
            if (!(e instanceof CLError)) {
                throw e;
            }
        }
    }
}

function findDevice(host, deviceHint) {
    let type = host.cl.defs.CL_DEVICE_TYPE_ALL;
    let upper = deviceHint.toUpperCase();
    if (upper === "GPU") {
        type = host.cl.defs.CL_DEVICE_TYPE_GPU;
    }
    else if (upper === "CPU") {
        type = host.cl.defs.CL_DEVICE_TYPE_CPU;
    }

    let all = enumAvailableDevices(host, type);

    if (type === host.cl.defs.CL_DEVICE_TYPE_ALL) {
        // Find exact device by ID:
        for (let dev of all) {
            if (dev.vendorID === deviceHint) {
                // Found!
                return dev;
            }
        }

        // Find by partial device id:
        for (let dev of all) {
            if (dev.vendorID.indexOf(deviceHint) >= 0) {
                // Found!
                return dev;
            }
        }
    }
    else {
        let best = null;
        let bestCores = 0;
        for (let dev of all) {
            let cores = dev.maxComputeUnits;

            if (cores > bestCores) {
                bestCores = cores;
                best = dev;
            }
        }

        if (bestCores) {
            return best;
        }
    }

    throw new Error(`OpenCL device by hint '${deviceHint}' not found.`);
}

function NContext() {
    let args = new Args([
        {deviceHint: Args.Required | Args.STRING}
    ], arguments);

    this.options = {
        deviceHint: args.deviceHint
    };

    this.clHost = CLHost.createV11();
    this.clDevice = findDevice(this.host, this.options.deviceHint);
    this.clContext = new CLContext(this.clDevice);
    this.clQueue = new CLCommandQueue(this.clContext, this.clDevice);
}

module.exports = NContext;