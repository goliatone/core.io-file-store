/*jshint esversion:6, node:true*/
'use strict';
const extend = require('gextend');

module.exports = {
    autoinitialize: true,
    logger: extend.shim(console)
};
