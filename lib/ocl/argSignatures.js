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
                return arg.type + " " + arg.name;
            }).join(", ");
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

ArgSignatures.prototype.tryGetArgWithOrder = function (name, index1, index2, index3) {
    var idx = null;
    if (index1 instanceof ArgIndex) {
        idx = index1;
    }
    else if (_.isNumber(index1)) {
        idx = new ArgIndex(index1, index2, index3);
    }
    let i = 0;
    for (let arg of this._items) {
        if (arg.namePrefix === name && ((idx === null && arg.index === null) || (idx !== null && arg.index !== null && idx.equals(arg.index)))) {
            return {
                order: i,
                arg: arg
            };
        }
        i++;
    }
};

ArgSignatures.prototype.getArgWithOrder = function (name, index1, index2, index3) {
    var result = this.tryGetArgWithOrder(name, index1, index2, index3);
    if (result) {
        return result;
    }
    throw new Error("Argument '" + name + "' not found.");
};

ArgSignatures.prototype.tryGetArg = function (name, index1, index2, index3) {
    var result = this.tryGetArgWithOrder(name, index1, index2, index3);
    return result ? result.arg : null;
};

ArgSignatures.prototype.getArg = function (name, index1, index2, index3) {
    return this.getArgWithOrder(name, index1, index2, index3).arg;
};

ArgSignatures.prototype.getArgsByCategories = function (categories) {
    categories = _.isArray(categories) ? categories : arguments;
    this._sort();
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

ArgSignatures.prototype.forEachArgsByCategories = function(category, f, thisArg) {
    _.forEach(this.getArgsByCategories(category), f, thisArg);
};

module.exports = ArgSignatures;