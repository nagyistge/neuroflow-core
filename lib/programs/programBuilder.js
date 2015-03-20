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

function ProgramBuilder () {
    let args = new Args([
        { nContext: Args.Required | Args.OBJECT, _type: require("../nContext") },
        { name: Args.Required | Args.STRING }
    ], arguments);

    this.nContext = args.nContext;
    this.name = args.name;
    this._args = [];
    this._parts = [];
}

ProgramBuilder.prototype.addPart = function (part) {
    assert(part);
    assert(part.args instanceof Array);
    assert(_.isString(part.template));
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

    assert(self._parts.length, "Cannot build an empty program.");

    let programLauncher = new ProgramLauncher(this.nContext);
    var no = 1;
    let addPartToProgram = async(function*(part) {
        let code = part.template;
        if (part.includes && part.includes.length) {
            code = part.includes.join("\n") + "\n" + code;
        }
        let builder = new KernelBuilder(`${self.name}_k_${no}`, self.nContext.options.precision, part.args, code, part.templateOptions);
        let kernelLauncher = yield builder.build({
            context: self.nContext.clContext,
            device: self.nContext.clDevice,
            compilerOptions: self.nContext.options.kernelBuildOptions.compilerOptions,
            useFileCache: self.nContext.options.kernelBuildOptions.useFileCache,
            cacheRootPath: self.nContext.options.kernelBuildOptions.cacheRootPath
        });
        programLauncher.addPart(kernelLauncher, new NDRange(part.globalSize), part.localSize);
    });

    for (let part of self._parts) {
        yield addPartToProgram(part);
        no++;
    }

    return programLauncher;
});

module.exports = ProgramBuilder;