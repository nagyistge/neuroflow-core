/*jslint node:true,nomen:true,vars:true,plusplus:true,white:true,unparam:true,bitwise:true*/
/*jshint onevar:true*/
'use strict';

var assert = require('assert');
var _ = require('lodash');
var Args = require('args-js');
var nooocl = require('nooocl');
var ArgSignatures = require('./argSignatures');
var codeTemplates = require('./codeTemplates');

function KernelBuilder(kernelName, args, template, options) {
    var cargs = new Args([
        { kernelName: Args.STRING | Args.Required },
        { args: Args.OBJECT | Args.Optional, _type: ArgSignatures },
        { template: Args.STRING | Args.Optional },
        { options: Args.OBJECT | Args.Optional }
    ], arguments);

    this._compiledTemplate = null;
    this._template = null;

    this.kernelName = cargs.kernelName;
    this.args = cargs.args || new ArgSignatures();
    this.template = cargs.template || null;
    this.options = cargs.options || {};

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
                forEachGlobalBegin: function(sizeArgName, idxVarName) {
                    var tmplOptions = {
                        sizeArgName: sizeArgName || 'size',
                        idxVarName: idxVarName || 'idx'
                    };
                    self._push(tmplOptions);
                    return self._forEachGlobalBeginTmpl(tmplOptions);
                },
                forEachGlobalEnd: function(idxVarName) {
                    return self._forEachGlobalEndTmpl(self._pop());
                }
            }
        });
    }
};

KernelBuilder.prototype._push = function(obj) {
    this._stack.push(obj);
};

KernelBuilder.prototype._pop = function() {
    if (this._stack.length) {
        var result = this._stack[this._stack.length - 1];
        this._stack.length--;
        return result;
    }
    throw new Error('Option stack is invalid.');
};

module.exports = KernelBuilder;