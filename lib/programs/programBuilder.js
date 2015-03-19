"use strict";
let _ = require("lodash");
let Args = require("args-js");
let assert = require("assert");
let ArgSignature = require("./argSignature");
let async = require("../utils/task").async;
let ProgramLauncher = require("./programLauncher");
let KernelBuilder = require("./kernelBuilder");
let codeTemplates = require("./codeTemplates");
let nooocl = require("nooocl");
let NDRange = nooocl.NDRange;

function ProgramBuilder() {
    let args = new Args([
        {nContext: Args.Required | Args.OBJECT, _type: require("../nContext")},
        {name: Args.Required | Args.STRING},
        {locLimit: Args.Optional | Args.INT}
    ], arguments);

    this.nContext = args.nContext;
    this.name = args.name;
    this.options = {
        locLimit: args.locLimit
    };
    this._args = [];
    this._parts = [];
}

ProgramBuilder.prototype.addPart = function (part) {
    assert(part);
    assert(part.args instanceof Array);
    assert(part.template instanceof String);
    assert(part.globalSize > 0);
    assert(part.localSize ? (part.localSize > 0) : true);

    for (let arg of part.args) {
        assert(arg instanceof ArgSignature, `Arg: '${arg}' is not an instance of ArgSignature.`);
        var inAlready = _.find(this._args, function (argIn) {
            return argIn.equals(arg);
        });
        if (inAlready) {
            if (inAlready.type !== arg.type) {
                throw new Error(`Arg: '${arg}' has been already added but with different type of '${inAlready.type}'.`);
            }
        }
        else {
            this._args.push(arg);
        }
    }

    this._parts.push({
        args: _.clone(part.args),
        template: part.template,
        templateOptions: part.templateOptions || null,
        includes: part.includes || null,
        globalSize: part.globalSize,
        localSize: part.localSize
    });
};

ProgramBuilder.prototype.build = async(function*() {
    let self = this;
    let locLimit = this.options.locLimit || 0;
    if (locLimit <= 0) {
        locLimit = 10000000;
    }

    let programLauncher = new ProgramLauncher(this.nContext);

    var loc = 0;
    var no = 1;
    var args = [];
    var template = null;
    var templateOptions = {};
    var includes = [];
    var ndRange = {
        globalSum: 0,
        globalCount: 0,
        localMax: 0
    };
    let addArgs = function (newArgs) {
        for (let newArg of newArgs) {
            if (!_.find(args, newArg, function (a) {
                    return a.equals(newArg);
                })) {
                args.push(newArg);
            }
        }
    };
    let addTemplate = function (newTemplate) {
        let newLoc = newTemplate.split(/\r\n|\r|\n/).length;
        if (template) {
            template += codeTemplates.globalBarrier(true);
        }
        else {
            template = newTemplate;
        }
        loc += newLoc;
    };
    let addTemplateOptions = function (newTemplateOptions) {
        if (_.isPlainObject(newTemplateOptions)) {
            let keyCount = _.keys(templateOptions).length;
            let newKeyCount = _.keys(newTemplateOptions).length;
            _.extend(templateOptions, newTemplateOptions);
            if (_.keys(templateOptions).length !== keyCount + newKeyCount) {
                throw new Error("Template option keys must be unique for each parts.");
            }
        }
    };
    let addIncludes = function (newIncludes) {
        if (_.isArray(newIncludes)) {
            if (!_.contains(includes, newIncludes)) {
                includes.push(newIncludes);
            }
        }
        else if (_.isString(newIncludes)) {
            for (let newInclude of newIncludes) {
                if (!_.contains(includes, newInclude)) {
                    includes.push(newInclude);
                }
            }
        }
    };
    let addNDRange = function (globalSize, localSize) {
        ndRange.globalSum += globalSize;
        ndRange.globalCount++;
        if (localSize && localSize > ndRange.localMax) {
            ndRange.localMax = localSize;
        }
    };
    let addPartToProgram = async(function*() {
        let code = template;
        if (includes.length) {
            code = includes.join("\n") + "\n" + code;
        }
        let builder = new KernelBuilder(`${self.name}_k_${no}`, self.nContext.options.precision, args, code, templateOptions);
        let kernelLauncher = yield builder.build({
            context: self.nContext.clContext,
            device: self.nContext.clDevice,
            compilerOptions: self.nContext.options.kernelBuildOptions.compilerOptions,
            useFileCache: self.nContext.options.kernelBuildOptions.useFileCache,
            cacheRootPath: self.nContext.options.kernelBuildOptions.cacheRootPath
        });
        programLauncher.addPart(kernelLauncher, new NDRange(Math.round(ndRange.globalSum / ndRange.globalCount)), ndRange.localMax ? new NDRange(ndRange.localMax) : undefined);
        loc = 0;
        no = 1;
        args = [];
        template = null;
        templateOptions = {};
        includes = [];
        ndRange = {
            globalSum: 0,
            globalCount: 0,
            localMax: 0
        };
    });

    for (let part of this._parts) {
        addArgs(part.args);
        addTemplate(part.template);
        addTemplateOptions(part.templateOptions);
        addNDRange(part.globalSize, part.localSize);
        if (loc > locLimit) {
            yield addPartToProgram();
            no++;
        }
    }

    if (loc) {
        yield addPartToProgram();
    }

    return programLauncher;
});

module.exports = ProgramBuilder;