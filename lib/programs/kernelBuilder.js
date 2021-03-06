"use strict";

let _ = require("lodash");
let Args = require("args-js");
let nooocl = require("nooocl");
let ArgSignatures = require("./argSignatures");
let codeTemplates = require("./codeTemplates");
let path = require("path");
let os = require("os");
let crypto = require("crypto");
let CLContext = nooocl.CLContext;
let CLDevice = nooocl.CLDevice;
let Bluebird = require("bluebird");
let fs = Bluebird.promisifyAll(require("fs"));
let mkdirp = Bluebird.promisify(require("mkdirp"));
let moment = require("moment");
let KernelLauncher = require("./kernelLauncher");
let async = require("../utils/task").async;
let assert = require("assert");

function KernelBuilder() {
    let cargs = new Args([
        { kernelName: Args.STRING | Args.Required },
        {
            precision: Args.STRING | Args.Optional,
            _default: "single",
            _check: function (v) {
                return v === "single" || v === "double";
            }
        },
        { args: Args.ANY | Args.Optional },
        { template: Args.STRING | Args.Optional },
        { options: Args.OBJECT | Args.Optional }
    ], arguments);

    this._compiledTemplate = null;
    this._template = null;

    this.kernelName = cargs.kernelName;
    this.args = _.isArray(cargs.args) ? new ArgSignatures(cargs.args) :
        cargs.args instanceof ArgSignatures ? cargs.args : new ArgSignatures();
    this.template = cargs.template || null;
    this.options = cargs.options || {};
    this.precision = cargs.precision;

    this._interpolate = /\{\{([\s\S]+?)\}\}/g;
    this._forEachGlobalBeginTmpl = _.template(codeTemplates.forEachGlobalBegin(), { interpolate: this._interpolate });
    this._forEachGlobalEndTmpl = _.template(codeTemplates.forEachGlobalEnd(), { interpolate: this._interpolate });
    this._stack = [];
}

Object.defineProperties(KernelBuilder.prototype, {
    template: {
        get: function () {
            return this._template;
        },
        set: function (value) {
            this._template = value;
            this._compiledTemplate = null;
        }
    },
    source: {
        get: function () {
            if (!this.template) {
                return null;
            }
            this._compileTemplate();
            return this._compiledTemplate({
                kernelName: this.kernelName,
                options: this.options
            }).replace(/\breal\b/g, this.precision === "single" ? "float" : "double");
        }
    }
});

KernelBuilder.prototype._compileTemplate = function () {
    let self = this;
    if (this._compiledTemplate === null) {
        this._compiledTemplate = _.template(this._template + "\n", {
            interpolate: self._interpolate,
            imports: {
                args: this.args,
                forEachGlobalBegin: function (sizeArgName, idxVarName) {
                    let tmplOptions = {
                        sizeArgName: sizeArgName || "size",
                        idxVarName: idxVarName || "idx"
                    };
                    self._push(tmplOptions);
                    return self._forEachGlobalBeginTmpl(tmplOptions);
                },
                forEachGlobalEnd: function () {
                    return self._forEachGlobalEndTmpl(self._pop());
                }
            }
        });
    }
};

KernelBuilder.prototype._push = function (obj) {
    this._stack.push(obj);
};

KernelBuilder.prototype._pop = function () {
    if (this._stack.length) {
        let result = this._stack[this._stack.length - 1];
        this._stack.length--;
        return result;
    }
    throw new Error("Option stack is invalid.");
};

KernelBuilder.prototype.build = async(function* () {
    let self = this;

    assert(self.args && self.args.items.length, "Cannot build kernel without arguments.");

    let args = new Args([
        { context: Args.OBJECT | Args.Required, _type: CLContext },
        { device: Args.OBJECT | Args.Optional, _type: CLDevice },
        { compilerOptions: Args.STRING | Args.Optional, _default: "-cl-fast-relaxed-math" },
        { useFileCache: Args.BOOL | Args.Optional, _default: false },
        { cacheRootPath: Args.STRING | Args.Optional, _default: null }
    ], arguments);

    let context = args.context;
    let compilerOptions = args.compilerOptions;
    let useFileCache = args.useFileCache;

    let device = args.device;
    if (!device) {
        let ctxDevices = context.devices;
        if (ctxDevices.length > 1) {
            throw new Error("Building for multiple devices is not supported.");
        }
        device = ctxDevices[0];
    }
    let source = self.source;
    assert(source, "Cannot build kernel from and empty source.");
    let program;
    var status;

    function throwIfError() {
        if (_.isUndefined(status)) {
            status = program.getBuildStatus(device);
        }
        if (status < 0) {
            //console.log(source);
            throw new Error("Builder error: " + status + "\n" + program.getBuildLog(device));
        }
    }

    //console.log(source);

    if (useFileCache) {
        let cacheRootPath = args.cacheRootPath || path.join(os.tmpdir(), "neuroflow-kernel-cache");
        let hash = crypto.createHash("sha256").update(source).digest("hex");
        let dirPath = path.join(cacheRootPath, self._getDate(), _.deburr(device.platform.name), _.deburr(device.name));
        let filePath = path.join(dirPath, self.kernelName + "_" + hash + ".bin");
        try {
            let buffer = yield fs.readFileAsync(filePath);
            program = context.createProgram(buffer, device);
            yield program.build();
        }
        catch (e) {
            // It doesn't exists (we hope):
            program = context.createProgram(source);
            yield program.build(compilerOptions);
            throwIfError();
            yield mkdirp(dirPath);
            yield fs.writeFileAsync(filePath, program.getBinaries()[0]);
        }
    }
    else {
        program = context.createProgram(source);
        yield program.build(compilerOptions);
        throwIfError();
    }

    return new KernelLauncher(program.createKernel(self.kernelName), self.args, self.precision);
});

KernelBuilder.prototype._getDate = function () {
    return moment().utc().format("YYYY-MM-DD");
};

module.exports = KernelBuilder;