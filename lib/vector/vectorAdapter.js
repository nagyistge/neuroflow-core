"use strict";
let _ = require("lodash");
let assert = require("assert");
let ref = require("ref");
let NBuffer = require("./nBuffer");

const externalVectorKind = {
    value: 1,
    buffer: 2,
    image2D: 3
};

function VectorAdapter(nContext) {
    assert(nContext instanceof require("../nContext"));

    this.nContext = nContext;
    this._externalVectors = new Map();
}

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
    assert(_.isPlainObject(size) && size.width > 0 && size.Height > 0, "Size is invalid.");
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
        size: size,
        channels: channels
    });
};

// TODO: enumerate internal infos, then get by name: _getInternalVectorInfo

VectorAdapter.prototype.attach = function(internalVectorName, externalVectorName, offset) {
    let intInfo = this._getInternalVectorInfo(internalVectorName);
    assert(intInfo, "Internal vector doesn't exists.");
    let extInfo = this._externalVectors.get(externalVectorName);
    assert(extInfo, "External vector doesn't exists.");

    assert(!(extInfo.kind === externalVectorKind.value && intInfo.direction === "output"), "Value vector cannot be attached to output direction.");
};

module.exports = VectorAdapter;
