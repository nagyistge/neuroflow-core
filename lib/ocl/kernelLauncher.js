/*jslint node:true,nomen:true,vars:true,plusplus:true,white:true,unparam:true,bitwise:true*/
/*jshint onevar:true*/
'use strict';

function KernelLauncher(kernel, args) {
    this.kernel = kernel;
    this.args = args;
}

module.exports = KernelLauncher;