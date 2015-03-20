"use strict";
let _ = require("lodash");
let nooocl = require("nooocl");
let CLImage2D = nooocl.CLImage2D;
let ref = require("ref");
let assert = require("assert");
let Args = require("args-js");

function getPixelSizeInBytes(nContext, format) {
    let channels = 4;
    let defs = nContext.clContext.cl.defs;
    if (format.imageChannelOrder === defs.CL_R || format.imageChannelOrder === defs.CL_A) {
        channels = 1;
    }
    else if (format.imageChannelOrder === defs.CL_INTENSITY || format.imageChannelOrder === defs.CL_LUMINANCE) {
        channels = 1;
    }
    else if (format.imageChannelOrder === defs.CL_RG || format.imageChannelOrder === defs.CL_RA || format.imageChannelOrder === defs.CL_Rx) {
        channels = 2;
    }
    else if (format.imageChannelOrder === defs.CL_RGB || format.imageChannelOrder === defs.CL_RGx) {
        channels = 3;
    }
    if (format.imageChannelDataType === defs.CL_SNORM_INT8 ||
        format.imageChannelDataType === defs.CL_UNORM_INT8 ||
        format.imageChannelDataType === defs.CL_SIGNED_INT8 ||
        format.imageChannelDataType === defs.CL_UNSIGNED_INT8) {
        return channels;
    }
    if (format.imageChannelDataType === defs.CL_HALF_FLOAT ||
        format.imageChannelDataType === defs.CL_SNORM_INT16 ||
        format.imageChannelDataType === defs.CL_UNORM_INT16 ||
        format.imageChannelDataType === defs.CL_SIGNED_INT16 ||
        format.imageChannelDataType === defs.CL_UNSIGNED_INT16) {
        return channels * 2;
    }
    if (format.imageChannelDataType === defs.CL_FLOAT ||
        format.imageChannelDataType === defs.CL_SIGNED_INT32 ||
        format.imageChannelDataType === defs.CL_UNSIGNED_INT32) {
        return channels * 4;
    }
    if (format.imageChannelDataType === defs.CL_UNORM_SHORT_565 ||
        format.imageChannelDataType === defs.CL_UNORM_SHORT_555) {
        return 2;
    }
    if (format.imageChannelDataType === defs.CL_UNORM_INT_101010) {
        return 4;
    }
    throw new Error("Unknown image channel data type.");
}

function NImage2D() {
    let args = new Args([
        { nContext: Args.Required | Args.OBJECT, _format: require("../nContext") },
        { baseImage: Args.Required | Args.OBJECT },
        {
            rw: Args.Optional | Args.STRING,
            _check: function (v) {
                return v === "readOnly" || v === "writeOnly" || v === "readWrite";
            }
        },
        {
            format: Args.Optional | Args.OBJECT
        },
        {
            size: Args.Optional | Args.OBJECT,
            _check: function (v) {
                return _.isPlainObject(v) && v.width > 0 && v.height > 0;
            }
        },
        { rowPitch: Args.Optional | Args.INT },
        { relatedData: Args.Optional | Args.ANY }
    ], arguments);

    this.nContext = args.nContext;
    this.clImage = null;
    let baseImage = args.baseImage;

    if (baseImage instanceof CLImage2D) {
        this.format = baseImage.format;
        this.clImage = baseImage;
        this.relatedData = args.relatedData;
    }
    else if (baseImage instanceof Buffer) {
        assert(args.format, "Format argument expected.");
        assert(args.size, "Size argument expected.");
        this.format = args.format;
        assert(baseImage.length % getPixelSizeInBytes(this.nContext, this.format) === 0 && baseImage.length / getPixelSizeInBytes(this.nContext, this.format) === (args.rowPitch || args.size.width) * args.size.height, "Buffer size is not correct.");
        this.relatedData = baseImage;
        this.clImage =
            args.rw === "readOnly" ? CLImage2D.wrapReadOnly(this.nContext.clContext, args.format, args.size.width, args.size.height, baseImage, args.rowPitch) :
                args.rw === "writeOnly" ? CLImage2D.wrapWriteOnly(this.nContext.clContext, args.format, args.size.width, args.size.height, baseImage, args.rowPitch) :
                    CLImage2D.wrap(this.nContext.clContext, args.format, args.size.width, args.size.height, baseImage, args.rowPitch);
    }
    else if (_.isArray(baseImage) || _.isTypedArray(baseImage)) {
        if (_.isTypedArray(baseImage)) {
            baseImage = new Uint8Array(baseImage.buffer);
        }
        var buffer = new Buffer(baseImage.length);
        for (let idx = 0; idx < baseImage.length; idx++) {
            ref.types.byte.set(buffer, idx, baseImage[idx]);
        }
        return new NImage2D({
            nContext: args.nContext,
            baseImage: baseImage,
            rw: args.rw,
            format: args.format,
            size: args.size,
            rowPitch: args.rowPitch
        });
    }
    else {
        assert(false, "Base buffer is not defined or its format is unsupported.");
    }
}

module.exports = NImage2D;