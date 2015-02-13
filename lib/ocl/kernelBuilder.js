/*jslint node:true,nomen:true,vars:true,plusplus:true,white:true,unparam:true,bitwise:true*/
/*jshint onevar:true*/
'use strict';

var assert = require('assert');
var _ = require('lodash');
var Args = require('args-js');
var nooocl = require('nooocl');
var ArgSignatures = require('./argSignatures');

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
}

Object.defineProperties(KernelBuilder.prototype, {
    template: {
        get: function() {
            return this._template;
        },
        set: function(value) {
            this._template = value;
            this._compiledTemplate = null;
        }
    },
    source: {
        get: function() {
            if (!this.template) {
                return null;
            }
            this._compileTemplate();
            return this._compiledTemplate({
                kernelName: this.kernelName,
                argSignatures: this.args.signatures
            });
        }
    }
});



module.exports = KernelBuilder;