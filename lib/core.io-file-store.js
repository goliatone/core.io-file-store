'use strict';

const extend = require('gextend');
const defaults = require('./defaults');

class Module {
    constructor(config = {}) {
        config = extend({}, this.constructor.defaults, config);

        if (config.autoinitialize) {
            this.init(config);
        }
    }

    init(config = {}) {
        if (this.initialized) return;
        this.initialized = true;

        extend(this, config);
        extend.unshim(this);
    }
}

Module.defaults = defaults;

module.exports = Module;
