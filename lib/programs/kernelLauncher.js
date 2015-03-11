"use strict";
var ArgIndex = require("./argIndex");
var _ = require("lodash");

function KernelLauncher(kernel, args, precision) {
    this.kernel = kernel;
    this.args = args;
    this.precision = precision;
}

KernelLauncher.prototype.setArg = function(name) {
    let value = null;
    let index = null;
    if (arguments[1] instanceof ArgIndex) {
        index = arguments[1];
        value = arguments[2];
    }
    else if(_.isNumber(arguments[1]) && !_.isUndefined(arguments[2])) {
        if(_.isNumber(arguments[2]) && !_.isUndefined(arguments[3])) {
            if(_.isNumber(arguments[3]) && !_.isUndefined(arguments[4])) {
                index = new ArgIndex(arguments[1], arguments[2], arguments[3]);
                value = arguments[4];
            }
            else {
                index = new ArgIndex(arguments[1], arguments[2]);
                value = arguments[3];
            }
        }
        else {
            index = new ArgIndex(arguments[1]);
            value = arguments[2];
        }
    }
    else {
        value = arguments[1];
    }
    let result = this.args.getArgWithOrder(name, index);
    this.kernel.setArg(result.order, value, !result.arg.isBuffer ? this._getArgType(result.arg) : undefined);
};

KernelLauncher.prototype._getArgType = function(arg) {
    let type = arg.type;
    return type === "real" ? (this.precision === "single" ? "float" : "double") : type;
};

module.exports = KernelLauncher;