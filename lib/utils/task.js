"use strict";

var Bluebird = require("bluebird");
var _ = require("lodash");

Bluebird.coroutine.addYieldHandler(function(v) {
    if (_.isArray(v) || _.isArguments(v)) {
        return Bluebird.all(v);
    }
});

var task = {
    async: function (f) {
        return Bluebird.coroutine(f);
    },

    doAsync: function (f) {
        return task.conv(Bluebird.coroutine(f));
    }
};

module.exports = task;
