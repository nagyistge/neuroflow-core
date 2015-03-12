"use strict";
let _ = require("lodash");
let assert = require("assert");

function DataAdapter(nContext) {
    assert(nContext instanceof require("../nContext"));

    this.nContext = nContext;
}

module.exports = DataAdapter;
