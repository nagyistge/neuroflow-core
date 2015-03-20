"use strict";

var fs = require("fs");
var _ = require("lodash");
var path = require("path");

var templateKey = "sdjf3ujq9gjgopigjqpog";

function loadTemplate (file, optionsPropertyName) {
    global[templateKey] = global[templateKey] || {};
    var cache = global[templateKey];
    var template = cache[file];
    if (!_.isString(template)) {
        template = fs.readFileSync(path.join(__dirname, file), "utf8");
        if (template.length === 0) {
            throw new Error("Template '" + file + "' is empty.");
        }
        if (template[template.length - 1] !== "\n") {
            template += "\n";
        }
        cache[file] = template;
    }

    if (optionsPropertyName) {
        template = template.replace(new RegExp("options.", "g"), "options." + optionsPropertyName + ".");
    }

    return template;
}

var codeTemplates = {
    localBarrier: function () {
        return "barrier(CLK_LOCAL_MEM_FENCE);\n";
    },

    globalBarrier: function () {
        return "barrier(CLK_GLOBAL_MEM_FENCE);\n";
    },

    forEachGlobalBegin: function () {
        return loadTemplate(path.join("templates", "forEachGlobalBegin.cl"));
    },

    forEachGlobalEnd: function () {
        return loadTemplate(path.join("templates", "forEachGlobalEnd.cl"));
    },

    gradientDescent: function (optionsPropertyName) {
        return loadTemplate(path.join("templates", "gradientDescent.cl"), optionsPropertyName || "gradientDescent");
    },

    vectorAdapter_InputCodeForValues: function (optionsPropertyName) {
        return loadTemplate(path.join("templates", "vectorAdapter_InputCodeForValues.cl", optionsPropertyName || "vectorAdapter_InputCodeForValues"));
    },

    vectorAdapter_InputCodeForBuffers: function (optionsPropertyName) {
        return loadTemplate(path.join("templates", "vectorAdapter_InputCodeForBuffers.cl"), optionsPropertyName || "vectorAdapter_InputCodeForBuffers");
    },

    vectorAdapter_OutputCodeForBuffers: function (optionsPropertyName) {
        return loadTemplate(path.join("templates", "vectorAdapter_OutputCodeForBuffers.cl"), optionsPropertyName || "vectorAdapter_OutputCodeForBuffers");
    }
};

module.exports = codeTemplates;