/*jslint node:true,nomen:true,vars:true,plusplus:true,white:true,unparam:true,bitwise:true*/
/*jshint onevar:true*/
'use strict';

var assert = require('assert');
var ArgSignature = require('./argSignature');
var _ = require('lodash');
var ArgIndex = require('./argIndex');

function ArgSignatures(args) {
    var self = this;
    this._items = [];
    _.forEach(_.isArray(args) ? args : arguments, function (arg) {
        assert(arg instanceof ArgSignature);
        self._items.push(arg);
    });
    this._sorted = false;
}

Object.defineProperties(ArgSignatures.prototype, {
    items: {
        get: function () {
            this._sort();
            return _.clone(this._items);
        }
    },
    signatures: {
        get: function () {
            return _.map(this.items, function (arg) {
                return arg.type + ' ' + arg.name;
            }).join(', ');
        }
    }
});

ArgSignatures.prototype._sort = function () {
    if (!this._sorted) {
        this._items.sort(
            function (a, b) {
                var aName = a.name;
                var bName = b.name;
                if (aName === bName) {
                    return 0;
                }
                return aName < bName ? -1 : 1;
            });
        this._sorted = true;
    }
};

ArgSignatures.prototype.add = function (arg) {
    function construct(constructor, args) {
        function F() {
            return constructor.apply(this, args);
        }
        F.prototype = constructor.prototype;
        return new F();
    }

    if(arg instanceof ArgSignature) {
        this._items.push(arg);
    }
    else {
        this._items.push(construct(ArgSignature, arguments));
    }
    this._sorted = false;
};

ArgSignatures.prototype.getArgByIndex = function (name, index1, index2, index3) {
    var idx = null;
    if (index1 instanceof ArgIndex) {
        idx = index1;
    }
    else {
        idx = new ArgIndex(index1, index2, index3);
    }
    return _.first(_.filter(this._items, function (arg) {
        return arg.namePrefix === name && idx.equals(arg.index);
    }));
};

ArgSignatures.prototype.getArgsByCategory = function (category) {
    this._sort();
    return _.filter(this._items,
        function (arg) {
            return arg.categories ? _.contains(arg.categories, category) : false;
        });
};

ArgSignatures.prototype.forEachArgsByCategory = function(category, f, thisArg) {
    _.forEach(this.getArgsByCategory(category), f, thisArg);
};

module.exports = ArgSignatures;