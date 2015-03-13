"use strict";
let _ = require("lodash");
let nooocl = require("nooocl");
let CLImage2D = nooocl.CLImage2D;
let ref = require("ref");
let assert = require("assert");
let Args = require("args-js");

const validFormats = new Set(["gray", "RGB", "RGBA", "BGRA", "ARGB"]);

function clFormatToFormat(defs, clFormat) {
    if (clFormat === defs.CL_R) {
        return "gray";
    }
    else if (clFormat === defs.CL_RGB) {
        return "RGB";
    }
    else if (clFormat === defs.CL_RGBA) {
        return "RGBA";
    }
    else if (clFormat === defs.CL_BGRA) {
        return "BGRA";
    }
    else if (clFormat === defs.CL_ARGB) {
        return "ARGB";
    }
    assert(false, "Image format is not supported.");
}

function formatToCLFormat(defs, clFormat) {
    if (clFormat === "gray") {
        return defs.CL_R;
    }
    else if (clFormat === "RGB") {
        return defs.CL_RGB;
    }
    else if (clFormat === "RGBA") {
        return defs.CL_RGBA;
    }
    else if (clFormat === "BGRA") {
        return defs.CL_BGRA;
    }
    else if (clFormat === "ARGB") {
        return defs.CL_ARGB;
    }
    assert(false, "Image format is not supported.");
}

function getPixelSizeInBytes(format) {
    switch (format) {
        case "gray":
            return 1;
        case "RGB":
            return 3;
        default:
            return 4;
    }
}

function NImage2D() {
    let args = new Args([
        {nContext: Args.Required | Args.OBJECT, _format: require("../nContext")},
        {baseImage: Args.Required | Args.OBJECT},
        {
            rw: Args.Optional | Args.STRING,
            _check: function (v) {
                return v === "readOnly" || v === "writeOnly" || v === "readWrite";
            }
        },
        {
            format: Args.Optional | Args.STRING,
            _check: function (v) {
                return validFormats.has(v);
            }
        },
        {
            size: Args.Optional | Args.OBJECT,
            _check: function (v) {
                return _.isPlainObject(v) && v.width > 0 && v.height > 0;
            }
        },
        {rowPitch: Args.Optional | Args.INT},
        {relatedData: Args.Optional | Args.ANY}
    ], arguments);

    this.nContext = args.nContext;
    this.clImage = null;
    let baseImage = args.baseImage;

    if (baseImage instanceof CLImage2D) {
        this.format = clFormatToFormat(baseImage.format);
        this.clImage = baseImage;
        this.relatedData = args.relatedData;
    }
    else if (baseImage instanceof Buffer) {
        assert(args.format, "Format argument expected.");
        assert(args.size, "Size argument expected.");
        this.format = args.format;
        assert(baseImage.length % getPixelSizeInBytes(this.format) === 0 && baseImage.length / getPixelSizeInBytes(this.format) === (args.rowPitch || args.size.width) * args.size.height, "Buffer size is not correct.");
        this.relatedData = baseImage;
        this.clImage =
            args.rw === "readOnly" ? CLImage2D.wrapReadOnly(this.nContext.clContext, formatToCLFormat(args.format), args.size.width, args.size.height, baseImage, args.rowPitch) :
                args.rw === "writeOnly" ? CLImage2D.wrapWriteOnly(this.nContext.clContext, formatToCLFormat(args.format), args.size.width, args.size.height, baseImage, args.rowPitch) :
                    CLImage2D.wrap(this.nContext.clContext, formatToCLFormat(args.format), args.size.width, args.size.height, baseImage, args.rowPitch);
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

    this.size = this.clImage.size / this.format.size;
}

module.exports = NImage2D;