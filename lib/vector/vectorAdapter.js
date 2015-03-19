"use strict";
let _ = require("lodash");
let assert = require("assert");
let ref = require("ref");
let NBuffer = require("./nBuffer");
let programs = require("../programs");
let ProgramBuilder = programs.ProgramBuilder;
let ArgSignature = programs.ArgSignature;
let ArgIndex = programs.ArgIndex;
let ArgSignatures = programs.ArgSignatures;
let codeTemplates = programs.codeTemplates;

const externalVectorKind = {
    value: 1,
    buffer: 2,
    image2D: 3
};

function VectorAdapter (nContext) {
    assert(nContext instanceof require("../nContext"));

    this.nContext = nContext;
    this._externalVectors = new Map();
    this.__internalVectors = null;
    this._inputAttachments = [];
    this._outputAttachments = [];
}

Object.defineProperties(VectorAdapter.prototype, {
    _internalVectors: {
        get: function () {
            if (!this.__internalVectors) {
                this.__internalVectors = new Map();
                for (let iv of this.enumerateInternalVectorInfos()) {
                    this.__internalVectors.set(iv.name, iv);
                }
            }
            return this.__internalVectors;
        }
    }
});

VectorAdapter.prototype.enumerateInternalVectorInfos = function () {
    throw new Error("Not implemented.");
};

VectorAdapter.prototype._verifyName = function (name) {
    assert(!(this._values.has(name) || this._buffers.has(name) || this._images.has(name)), `Vector '${name}' has been already defined.`);
    assert(_.isString(name), "Name is not a string.");
    name = name.trim();
    assert(name, "Name is empty.");
    return name;
};

VectorAdapter.prototype.defineValue = function (name, type, transform) {
    name = this._verifyName(name);
    assert(_.isUndefined(transform) || _.isPlainObject(transform) && _.isNumber(transform.multiply) && _.isNumber(transform.add), "Transform argument is invalid.");
    if (type === "real") {
        type = this.nContext.realType;
    }
    type = ref.coerceType(type);

    this._externalVectors.set(name, {
        name: name,
        kind: externalVectorKind.value,
        size: 1,
        type: type,
        transform: transform || null
    });
};

VectorAdapter.prototype.defineBuffer = function (name, size, transformBuffer) {
    assert(size > 0, "Size is invalid.");
    assert(
        _.isUndefined(transformBuffer) ||
        transformBuffer instanceof NBuffer && transformBuffer.type === this.nContext.realType && transformBuffer.size === size * 2, "Transform buffer type or size is invalid.");

    name = this._verifyName(name);

    this._externalVectors.set(name, {
        name: name,
        kind: externalVectorKind.buffer,
        size: size,
        transformBuffer: transformBuffer || null
    });
};

VectorAdapter.prototype.defineImage2D = function (name, size, channels) {
    name = this._verifyName(name);
    assert(_.isPlainObject(size) && size.width > 0 && size.height > 0, "Size is invalid.");
    if (channels === "gray") {
        channels = new Set(["R"]);
    }
    else if (_.isString(channels) || _.isArray(channels)) {
        let nc = new Set();
        if (channels.indexOf("R") >= 0) {
            nc.add("R");
        }
        if (channels.indexOf("G") >= 0) {
            nc.add("G");
        }
        if (channels.indexOf("B") >= 0) {
            nc.add("B");
        }
        if (channels.indexOf("A") >= 0) {
            nc.add("A");
        }
        channels = nc;
    }
    else {
        channels = null;
    }
    assert(channels instanceof Set && channels.size > 0 && (channels.has("R") || channels.has("G") || channels.has("B") || channels.has("A")), "Channels argument is invalid.");

    this._externalVectors.set(name, {
        name: name,
        kind: externalVectorKind.image2D,
        size: channels.size * size.width * size.height,
        channels: channels
    });
};

VectorAdapter.prototype.attach = function (internalVectorName, externalVectorName, offset) {
    let intInfo = this._internalVectors.get(internalVectorName);
    assert(intInfo, `Internal vector by name of '${internalVectorName}' doesn't exists.`);
    let extInfo = this._externalVectors.get(externalVectorName);
    assert(extInfo, `External vector by name of '${externalVectorName}' doesn't exists.`);

    assert(!(extInfo.kind === externalVectorKind.value && intInfo.direction === "output"), "Value vector cannot be attached to output direction.");
    assert(offset >= 0 && offset + extInfo.size <= intInfo.size, `Attachment is not fit in the internal vector bounds.`);
    let attachments = (intInfo.direction === "input") ? this._inputAttachments : this._outputAttachments;
    this._verifyIfNotOverlapped(attachments, offset, extInfo.size);
    attachments.push({
        internalVectorInfo: intInfo,
        externalVectorInfo: extInfo,
        offset: offset,
        size: extInfo.size
    });
};

VectorAdapter.prototype.defineInputCode = function (programBuilder) {
    assert(programBuilder instanceof ProgramBuilder);
    this._defineInputCodeOfValues(programBuilder);
};

VectorAdapter.prototype._defineInputCodeOfValues = function (programBuilder) {
    let inputs = this._inputAttachments.filter(function (a) { return a.externalVectorInfo.kind === externalVectorKind.value; });
    if (!inputs.length) {
        return;
    }
    let index = 0;
    let options = {
        inputValueCategory: "vectorAdapter_InputCodeForValues",
        inputArgNames: [],
        inputValueOffsetArgNamePrefix: "vectorAdapter_InputValueOffset",
        inputValueMultiplyArgNamePrefix: "vectorAdapter_InputValueMultiply",
        inputValueAddArgNamePrefix: "vectorAdapter_InputValueAdd"
    };
    let args = [];
    for (let attachment of inputs) {
        args.push(new ArgSignature(attachment.externalVectorInfo.type, "vectorAdapter_InputValue", new ArgIndex(index), options.inputValueCategory));
        args.push(new ArgSignature("uint", options.inputValueOffsetArgNamePrefix, new ArgIndex(index), options.inputValueCategory));
        options.inputArgNames.push(attachment.internalVectorInfo.name);
        if (attachment.externalVectorInfo.transform) {
            args.push(new ArgSignature(this.nContext.realType, options.inputValueMultiplyArgNamePrefix, new ArgIndex(index), options.inputValueCategory));
            args.push(new ArgSignature(this.nContext.realType, options.inputValueAddArgNamePrefix, new ArgIndex(index), options.inputValueCategory));
        }
        index++;
    }
    options = {
        vectorAdapter_InputCodeForValues: options
    };
    let tmpl = codeTemplates.vectorAdapter_InputCodeForValues();
    programBuilder.addPart({
        args: args,
        template: tmpl,
        templateOptions: options,
        globalSize: 1
    });
};

VectorAdapter.prototype._defineInputCodeOfBuffers = function (programBuilder) {
    let inputs = this._inputAttachments.filter(function (a) { return a.externalVectorInfo.kind === externalVectorKind.buffer; });
    if (!inputs.length) {
        return;
    }
    let index = 0;
    let options = {
        inputBufferCategory: "vectorAdapter_InputCodeForBuffers",
        inputBuffersMaxSize: 0,
        inputArgNames: [],
        inputBufferOffsetArgNamePrefix: "vectorAdapter_InputBufferOffset",
        inputBufferSizeArgNamePrefix: "vectorAdapter_InputBufferSize",
        inputBufferTransformBufferArgNamePrefix: "vectorAdapter_InputBufferTransformBuffer"
    };
    let args = [];
    for (let attachment of inputs) {
        args.push(new ArgSignature(attachment.externalVectorInfo.type, "vectorAdapter_InputBuffer", new ArgIndex(index), options.inputBufferCategory));
        args.push(new ArgSignature("uint", options.inputBufferOffsetArgNamePrefix, new ArgIndex(index), options.inputBufferCategory));
        args.push(new ArgSignature("uint", options.inputBufferSizeArgNamePrefix, new ArgIndex(index), options.inputBufferCategory));
        options.inputArgNames.push(attachment.internalVectorInfo.name);
        if (attachment.externalVectorInfo.size > options.inputBuffersMaxSize) {
            options.inputBuffersMaxSize = attachment.externalVectorInfo.size;
        }
        if (attachment.externalVectorInfo.transformBuffer) {
            args.push(new ArgSignature(`global ${this.nContext.realType}*`, options.inputBufferTransformBufferArgNamePrefix, new ArgIndex(index), options.inputBufferCategory));
        }
        index++;
    }
    let globalSize = options.inputBuffersMaxSize;
    options = {
        vectorAdapter_InputCodeForBuffers: options
    };
    let tmpl = codeTemplates.vectorAdapter_InputCodeForBuffers();
    programBuilder.addPart({
        args: args,
        template: tmpl,
        templateOptions: options,
        globalSize: globalSize
    });
};

VectorAdapter.prototype.defineOutputCode = function (programBuilder) {
    assert(programBuilder instanceof ProgramBuilder);
};

VectorAdapter.prototype._verifyIfNotOverlapped = function (attachments, offset, size) {
    let throwOverlapped = function (a) {
        assert(false, `Attachment is overlapped with ${a.internalVectorName} <-> ${a.externalVectorName} attachment.`);
    };
    const end = offset + size;
    for (let attachment of attachments) {
        const aEnd = attachment.offset + attachment.size;
        if (offset <= attachment.offset) {
            if (end >= attachment.offset) {
                throwOverlapped(attachment);
            }
        }
        else { // offset > a.offset
            if (end <= aEnd) {
                throwOverlapped(attachment);
            }
        }
    }
};

module.exports = VectorAdapter;
