/*jslint node:true,nomen:true,vars:true,plusplus:true,white:true,unparam:true,bitwise:true*/
/*jshint onevar:true*/
'use strict';

var assert = require('assert');
var ArgIndex = require('./argIndex');
var _ = require('lodash');
var Args = require('args-js');

function ArgSignature(name, index, categories, type, value) {
    var args = new Args([
        {type: Args.STRING | Args.Required}, // global float*, __local int*, int, uint, constant int, ...
        {name: Args.STRING | Args.Required},
        {index: Args.OBJECT | Args.Optional, _type: ArgIndex, _default: null},
        {categories: Args.ARRAY | Args.STRING | Args.Optional, _default: null}
    ], arguments);

    this.namePrefix = args.name.trim();
    this.index = args.index;
    this.categories = _.isArray(args.categories) ? args.categories : [args.categories];
    this.type = args.type.trim();
}

Object.defineProperties(ArgSignature.prototype, {
    name: {
        get: function() {
            return this.index ? (this.namePrefix + '_' + this.index) : this.namePrefix;
        }
    },
    cType: {
        get: function() {
            return this.type
                .replace('global ', '')
                .replace('__global ', '')
                .replace('local ', '')
                .replace('__local ', '')
                .replace('constant ', '')
                .replace('__constant ', '')
                .trim();
        }
    }
});

ArgSignature.prototype.toString = function() {
    return this.name;
};

module.exports = ArgSignature;
