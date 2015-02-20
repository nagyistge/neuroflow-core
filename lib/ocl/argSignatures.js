"use strict";

var assert = require("assert");
var ArgSignature = require("./argSignature");
var _ = require("lodash");
var ArgIndex = require("./argIndex");

function ArgSignatures(args) {
    var self = this;
    this._items = [];
    _.forEach(_.isArray(args) ? args : arguments, function (arg) {
        assert(arg instanceof ArgSignature);
        self._items.push(arg);
    });
    this._map = null;
    this._sorted = false;
}

Object.defineProperties(ArgSignatures.prototype, {
    items: {
        get: function () {
            this._ensureSorted();
            return _.clone(this._items);
        }
    },
    signatures: {
        get: function () {
            return _.map(this.items, function (arg) {
                return arg.type + " " + arg.name;
            }).join(", ");
        }
    }
});

ArgSignatures.prototype._ensureSorted = function () {
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
        this._map = new Map();
        let i = 0;
        for (let arg of this._items) {
            this._map.set(arg.name, { arg: arg, order: i++});
        }
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

ArgSignatures.prototype.tryGetArgWithOrder = function (namePrefix, index1, index2, index3) {
    let argName = this._makeArgName(namePrefix, index1, index2, index3);
    this._ensureSorted();
    return this._map.get(argName) || null;
};

ArgSignatures.prototype.getArgWithOrder = function (namePrefix, index1, index2, index3) {
    var result = this.tryGetArgWithOrder(namePrefix, index1, index2, index3);
    if (result) {
        return result;
    }
    throw new Error("Argument '" + this._makeArgName(namePrefix, index1, index2, index3) + "' not found.");
};

ArgSignatures.prototype.tryGetArg = function (namePrefix, index1, index2, index3) {
    var result = this.tryGetArgWithOrder(namePrefix, index1, index2, index3);
    return result ? result.arg : null;
};

ArgSignatures.prototype.getArg = function (namePrefix, index1, index2, index3) {
    return this.getArgWithOrder(namePrefix, index1, index2, index3).arg;
};

ArgSignatures.prototype.getArgsByCategories = function (categories) {
    categories = _.isArray(categories) ? categories : arguments;
    this._ensureSorted();
    return _.filter(this._items,
        function (arg) {
            if (arg.categories) {
                var i;
                for (i = 0; i < categories.length; i++) {
                    if (_.contains(arg.categories, categories[i])) {
                        return true;
                    }
                }
            }
            return false;
        });
};

ArgSignatures.prototype._makeArgName = function(namePrefix, index1, index2, index3) {
    if (_.isUndefined(index1) || index1 === null) {
        return namePrefix;
    }
    if (_.isUndefined(index2) || index2 === null || index1 instanceof ArgIndex) {
        return namePrefix + "_" + index1;
    }
    if (_.isUndefined(index3) || index3 === null) {
        return namePrefix + "_" + index1 + "_" + index2;
    }
    return namePrefix + "_" + index1 + "_" + index2 + "_" + index3;
};

ArgSignatures.prototype.forEachArgsByCategories = function(category, f, thisArg) {
    _.forEach(this.getArgsByCategories(category), f, thisArg);
};

module.exports = ArgSignatures;