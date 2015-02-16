/*jslint node:true,nomen:true,vars:true,plusplus:true,white:true,unparam:true,bitwise:true*/
/*jshint onevar:true*/
'use strict';

var assert = require('assert');
var _ = require('lodash');
var Args = require('args-js');
var nooocl = require('nooocl');
var ArgSignatures = require('./argSignatures');
var codeTemplates = require('./codeTemplates');
var path = require('path');
var os = require('os');
var crypto = require('crypto');
var CLContext = nooocl.CLContext;
var CLDevice = nooocl.CLDevice;
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var mkdirp = Promise.promisify(require('mkdirp'));
var moment = require('moment');

function KernelBuilder(kernelName, args, template, options) {
    var cargs = new Args([
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
    var self = this;
    if (this._compiledTemplate === null) {
        this._compiledTemplate = _.template(this._template + '\n', {
            interpolate: self._interpolate,
            imports: {
                args: this.args,
                forEachGlobalBegin: function (sizeArgName, idxVarName) {
                    var tmplOptions = {
                        sizeArgName: sizeArgName || 'size',
                        idxVarName: idxVarName || 'idx'
                    };
                    self._push(tmplOptions);
                    return self._forEachGlobalBeginTmpl(tmplOptions);
                },
                forEachGlobalEnd: function (idxVarName) {
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
        var result = this._stack[this._stack.length - 1];
        this._stack.length--;
        return result;
    }
    throw new Error('Option stack is invalid.');
};

KernelBuilder.prototype.build = function (context, device, options, useFileCache, cacheRootPath) {
    var self = this;
    var args = new Args([
        {context: Args.OBJECT | Args.Required, _type: CLContext},
        {device: Args.OBJECT | Args.Optional, _type: CLDevice},
        {options: Args.STRING | Args.Optional, _default: '-cl-fast-relaxed-math'},
        {useFileCache: Args.BOOL | Args.Optional, _default: false},
        {cacheRootPath: Args.STRING | Args.Optional, _default: null}
    ], arguments);

    context = args.context;
    options = args.options;
    useFileCache = args.useFileCache;

    device = args.device;
    if (!device) {
        var ctxDevices = context.devices;
        if (ctxDevices.length > 1) {
            throw new Error('Building for multiple devices is not supported.');
        }
        device = ctxDevices[0];
    }
    var source = self.source;
    var program;
    var build;
    var status;

    function throwIfError() {
        if (_.isUndefined(status)) {
            status = program.getBuildStatus(device);
        }
        if (status < 0) {
            throw new Error('Builder error: ' + status + '\n' + program.getBuildLog(device));
        }
    }

    if (useFileCache) {
        cacheRootPath = args.cacheRootPath || path.join(os.tmpdir(), 'neuroflow-kernel-cache');
        var hash = crypto.createHash('sha256').update(source).digest('hex');
        var dirPath = path.join(cacheRootPath, self._getDate(), _.deburr(device.clVersion));
        var filePath = path.join(dirPath, self.kernelName + '_' + hash + '.bin');
        build = fs.readFileAsync(filePath).then(
            function (buffer) {
                program = context.createProgram(buffer, device);
                return program.build();
            },
            function (e) {
                // It doesn't exists (we hope):
                program = context.createProgram(source);
                return program.build(options).then(
                    function () {
                        throwIfError();
                        return mkdirp(dirPath).then(function() {
                            return fs.writeFileAsync(filePath, program.getBinaries()[0]);
                        });
                    }
                );
            });
    }
    else {
        program = context.createProgram(source);
        build = program.build(options);
    }

    return build.then(function () {
        throwIfError();
        return new KernelLauncher(program.createKernel(self.kernelName), this.args);
    });
};

KernelBuilder.prototype._getDate = function() {
    return moment().utc().format('YYYY-MM-DD');
};

module.exports = KernelBuilder;