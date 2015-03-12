'use strict';

var _ = require('lodash');
var assert = require('assert');

function ArgIndex(index1, index2, index3) {
    this.index1 = index1;
    this.index2 = index2;
    this.index3 = index3;
}

Object.defineProperties(ArgIndex.prototype, {
    dimensions: {
        get: function () {
            if (!_.isUndefined(this.index3)) {
                return 3;
            }
            if (!_.isUndefined(this.index2)) {
                return 2;
            }
            if (!_.isUndefined(this.index1)) {
                return 1;
            }
        }
    },
    indexes: {
        get: function () {
            var result = [this.index1];
            var dim = this.dimensions;
            if (dim >= 2) {
                result.push(this.index2);
            }
            if (dim === 3) {
                result.push(this.index3);
            }
            return result;
        }
    }
});

ArgIndex.prototype.equals = function (other) {
    return other instanceof ArgIndex &&
        other.index1 === this.index1 &&
        other.index2 === this.index2 &&
        other.index3 === this.index3;
};

ArgIndex.prototype.compareTo = function (index) {
    if (!index) {
        return 1;
    }
    if (this.dimensions < index.dimensions) {
        return -1;
    }
    if (this.dimensions > index.dimensions) {
        return 1;
    }

    var c = (this.index1 === index.index1) ? 0 : (this.index1 < index.index1 ? -1 : 1);
    if (c === 0) {
        c = (this.index2 === index.index2) ? 0 : (this.index2 < index.index2 ? -1 : 1);
    }
    if (c === 0) {
        c = (this.index3 === index.index3) ? 0 : (this.index3 < index.index3 ? -1 : 1);
    }
    return c;
};

ArgIndex.prototype.toString = function() {
    return this.indexes.join('_');
};

module.exports = ArgIndex;
