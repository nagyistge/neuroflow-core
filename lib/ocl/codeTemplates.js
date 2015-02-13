/*jslint node:true,nomen:true,vars:true,plusplus:true,white:true,unparam:true*/
/*jshint onevar:true*/
'use strict';

var fs = require('fs');
var _ = require('lodash');
var path = require('path');

var templateKey = 'sdjf3ujq9gjgopigjqpog';

function loadTemplate(file) {
    global[templateKey] = global[templateKey] || {};
    var cache = global[templateKey];
    var template = cache[file];
    if (_.isString(template)) {
        return template;
    }
    template = fs.readFileSync(path.join(__dirname, file), 'utf8');
    if (template.length === 0) {
        throw new Error('Template "' + file + '" is empty.');
    }
    if (template[template.length - 1] !== '\n') {
        template += '\n';
    }
    cache[file] = template;
    return template;
}

var codeTemplates = {
    localBarrier: function() {
        return 'barrier(CLK_LOCAL_MEM_FENCE);\n';
    },
    globalBarrier: function() {
        return 'barrier(CLK_GLOBAL_MEM_FENCE);\n';
    },
    gradientDescent: function() {
        return loadTemplate(path.join('templates', 'gradientDescent.cl'));
    }
};

module.exports = codeTemplates;