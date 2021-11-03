'use strict';

const Module = require('./core.io-file-store');

module.exports = function $init(context, config) {

    var _logger = context.getLogger('core.io-file-store');

    _logger.info('core.io-file-store module booting...');

    return new Promise(function(resolve, reject) {
        context.resolve({});
    });
};