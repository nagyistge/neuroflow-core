"use strict";
let _ = require("lodash");
let nooocl = require("nooocl");
let CLBuffer = nooocl.CLBuffer;
let ref = require("ref");
let assert = require("assert");
let Args = require("args-js");

function getType(baseBuffer) {
    let type = baseBuffer.name.substr(0, baseBuffer.name.length - "Array".length).toLowerCase();
    if (type === "float32") {
        type = "float";
    }
    else if (type === "float64") {
        type = "double";
    }
    return type;
}

function NBuffer() {
    let args = new Args([
        {nContext: Args.Required | Args.OBJECT, _type: require("../nContext")},
        {baseBuffer: Args.Required | Args.OBJECT},
        {type: Args.Optional | Args.OBJECT | Args.STRING},
        {
            rw: Args.Optional | Args.STRING,
            _check: function (v) {
                return v === "readOnly" || v === "writeOnly" || v === "readWrite";
            }
        },
        {relatedData: Args.Optional | Args.ANY}
    ], arguments);

    this.nContext = args.nContext;
    this.clBuffer = null;
    let baseBuffer = args.baseBuffer;

    if (baseBuffer instanceof CLBuffer) {
        this.type = ref.coerceType(args.type);
        assert(baseBuffer.size % this.type.size === 0, "Buffer size is not correct.");
        this.clBuffer = baseBuffer;
        this.relatedData = args.relatedData;
    }
    else if (baseBuffer instanceof Buffer) {
        if (args.type === "real") {
            args.type = this.nContext.realType;
        }
        this.type = ref.coerceType(args.type);
        assert(baseBuffer.length % this.type.size === 0, "Buffer size is not correct.");
        this.relatedData = baseBuffer;
        this.clBuffer =
            args.rw === "readOnly" ? CLBuffer.wrapReadOnly(this.nContext.clContext, baseBuffer) :
                args.rw === "writeOnly" ? CLBuffer.wrapWriteOnly(this.nContext.clContext, baseBuffer) :
                    CLBuffer.wrap(this.nContext.clContext, baseBuffer);
    }
    else if (_.isArray(baseBuffer) || _.isTypedArray(baseBuffer)) {
        if (_.isTypedArray(baseBuffer)) {
            this.type = ref.coerceType(getType(baseBuffer));
        }
        if (args.type === "real") {
            args.type = this.nContext.realType;
        }
        this.type = ref.coerceType(args.type);
        var buffer = new Buffer(baseBuffer.length * this.type.size);
        for (let idx = 0; idx < baseBuffer.length; idx++) {
            this.type.set(buffer, idx * this.type.size, baseBuffer[idx]);
        }
        return new NBuffer(this.nContext, buffer, this.type);
    }
    else {
        assert(false, "Base buffer is not defined or its type is unsupported.");
    }

    this.size = this.clBuffer.size / this.type.size;
}

module.exports = NBuffer;