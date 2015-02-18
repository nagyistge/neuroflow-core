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

function KernelBuilder() {
    let cargs = new Args([
        {kernelName: Args.STRING | Args.Required},
        {args: Args.OBJECT | Args.Optional, _type: ArgSignatures},
        {template: Args.STRING | Args.Optional},
        {options: Args.OBJECT | Args.Optional}
    ], arguments);

    this._compiledTemplate = null;
    this._template = null;

    this.kernelName = cargs.kernelName;
    this.args = cargs.args || new ArgSignatures();
    this.template = cargs.template || null;
    this.options = cargs.options || {};

    this._interpolate = /\{\{([\s\S]+?)\}\}/g;
    this._forEachGlobalBeginTmpl = _.template(codeTemplates.forEachGlobalBegin(), {interpolate: this._interpolate});
    this._forEachGlobalEndTmpl = _.template(codeTemplates.forEachGlobalEnd(), {interpolate: this._interpolate});
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
            });
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

KernelBuilder.prototype.build = async(function* (context, device, options, useFileCache, cacheRootPath) {
    let self = this;
    let args = new Args([
        {context: Args.OBJECT | Args.Required, _type: CLContext},
        {device: Args.OBJECT | Args.Optional, _type: CLDevice},
        {options: Args.STRING | Args.Optional, _default: "-cl-fast-relaxed-math"},
        {useFileCache: Args.BOOL | Args.Optional, _default: false},
        {cacheRootPath: Args.STRING | Args.Optional, _default: null}
    ], arguments);

    context = args.context;
    options = args.options;
    useFileCache = args.useFileCache;

    device = args.device;
    if (!device) {
        let ctxDevices = context.devices;
        if (ctxDevices.length > 1) {
            throw new Error("Building for multiple devices is not supported.");
        }
        device = ctxDevices[0];
    }
    let source = self.source;
    let program;
    var status;

    function throwIfError() {
        if (_.isUndefined(status)) {
            status = program.getBuildStatus(device);
        }
        if (status < 0) {
            throw new Error("Builder error: " + status + "\n" + program.getBuildLog(device));
        }
    }

    if (useFileCache) {
        cacheRootPath = args.cacheRootPath || path.join(os.tmpdir(), "neuroflow-kernel-cache");
        let hash = crypto.createHash("sha256").update(source).digest("hex");
        let dirPath = path.join(cacheRootPath, self._getDate(), _.deburr(device.clVersion));
        let filePath = path.join(dirPath, self.kernelName + "_" + hash + ".bin");
        try {
            let buffer = yield fs.readFileAsync(filePath);
            program = context.createProgram(buffer, device);
            yield program.build();
        }
        catch (e) {
            // It doesn't exists (we hope):
            program = context.createProgram(source);
            yield program.build(options);
            throwIfError();
            yield mkdirp(dirPath);
            yield fs.writeFileAsync(filePath, program.getBinaries()[0]);
        }
    }
    else {
        program = context.createProgram(source);
        yield program.build(options);
        throwIfError();
    }

    return new KernelLauncher(program.createKernel(self.kernelName), self.args);
});

KernelBuilder.prototype._getDate = function() {
    return moment().utc().format("YYYY-MM-DD");
};

module.exports = KernelBuilder;