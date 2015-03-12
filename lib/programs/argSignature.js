"use strict";

var ArgIndex = require("./argIndex");
var _ = require("lodash");
var Args = require("args-js");

function ArgSignature() {
    var args = new Args([
        {type: Args.STRING | Args.Required}, // global float*, __local int*, int, uint, constant int, ...
        {namePrefix: Args.STRING | Args.Required},
        {index: Args.OBJECT | Args.Optional, _type: ArgIndex, _default: null},
        {categories: Args.ARRAY | Args.STRING | Args.Optional, _default: null}
    ], arguments);

    this.namePrefix = args.namePrefix.trim();
    this.index = args.index;
    this.categories = _.isArray(args.categories) ? args.categories : [args.categories];
    this.type = args.type.trim();
    this.name = ArgSignature.createName(this.namePrefix, this.index);
}

ArgSignature.createName = function(namePrefix, index) {
    return index ? (namePrefix + "_" + index) : namePrefix;
};

Object.defineProperties(ArgSignature.prototype, {
    cType: {
        get: function () {
            return this.type
                .replace("global ", "")
                .replace("__global ", "")
                .replace("local ", "")
                .replace("__local ", "")
                .replace("constant ", "")
                .replace("__constant ", "")
                .trim();
        }
    },
    isGlobalBuffer: {
        get: function () {
            return _.startsWith(this.type, "global ") || _.startsWith(this.type, "__global ");
        }
    },
    isLocalBuffer: {
        get: function () {
            return _.startsWith(this.type, "local ") || _.startsWith(this.type, "__local ");
        }
    },
    isConstantBuffer: {
        get: function () {
            return _.startsWith(this.type, "constant ") || _.startsWith(this.type, "__constant ");
        }
    },
    isBuffer: {
        get: function () {
            return this.type.indexOf("*") !== -1;
        }
    }
});

ArgSignature.prototype.toString = function () {
    return this.name;
};

ArgSignature.prototype.equals = function (other) {
    return this === other || other instanceof ArgSignature && this.name === other.name;
};

module.exports = ArgSignature;
