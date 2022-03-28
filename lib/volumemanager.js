'use strict';

const extend = require('gextend');

const { UnknownVolume } = require('./exceptions');

const defaults = {
    autoinitialize: true,
    logger: extend.shim(console),

    /**
     * Name of the default volume definition.
     * It should match one of volumeDefinitions.
     */
    defaultVolume: require('./drivers/fs').protocol,
    drivers: {
        fs: require('./drivers/fs'),
        s3: require('./drivers/s3'),
    },
    /**
     * Definition for our named volumes.
     */
    volumeDefinitions: {
        fs: {
            protocol: require('./drivers/fs').protocol,
            config: require('./drivers/fs').defaults
        },
        s3: {
            protocol: require('./drivers/s3').protocol,
            config: require('./drivers/s3').defaults
        }
    }
};

class VolumeManager {
    constructor(config = {}) {
        config = extend({}, this.constructor.defaults, config);
        if (config.autoinitialize) {
            this.init(config);
        }
    }

    init(config = {}) {
        if (this.initialized) return;
        this.initialized = true;

        config = extend({}, this.constructor.defaults, config);

        /**
         * Volume holds the initialized
         * drivers which we use to interact
         * with the file system.
         */
        this.volumes = {};

        /**
         * We store configurations for
         * volume storage
         */
        this.volumeDefinitions = {};

        /**
         * Available drivers.
         * Drivers provide the adapter to interact
         * with an external storage system like S3.
         */
        this.drivers = {};

        extend(this, config);

        this.volumes = asMap(this.volumes);
        this.drivers = asMap(this.drivers);
        this.volumeDefinitions = asMap(this.volumeDefinitions);
    }

    /**
     * Get a volume if is registered and initialized.
     * If not initialized it will create an instance.
     *
     * @param {String} name Volume name
     * @returns {Volume}
     */
    getVolume(name = this.defaultVolume) {
        if (this.volumes.has(name)) {
            return this.volumes.get(name);
        }

        const definition = this.volumeDefinitions.get(name);

        if (!definition) {
            throw new UnknownVolume(name);
        }

        const VolumeDriver = this.getDriver(definition.protocol);

        const volume = new VolumeDriver(definition.config);

        this.volumes.set(name, volume);

        return volume;
    }

    /**
     * Add a new volume definition.
     *
     * Volume names are logical names that can
     * represent namespaces:
     * - pictures
     * - uploads
     * - logs
     *
     * We can change the options when we add
     * a volume and decide which driver will use.
     *
     * - pictures: s3:public
     * - uploads: s3:private
     * - logs: lfs
     *
     * @param {String} name Volume identifier
     * @param {Object} options Volume configuration options
     * @param {String} options.protocol Driver identifier
     * @param {Object} options.config Driver config options
     * @returns
     */
    addVolume(name, options, overwrite = false) {
        if (this.volumeDefinitions.has(name) && !overwrite) {
            return
        }
        this.volumeDefinitions.set(name, options);
    }

    /**
     *
     * @param {String} protocol Driver protocol
     * @param {Class} adapterConstructor Adapter constructor
     */
    addDriver(protocol, adapterConstructor) {
        this.drivers.set(protocol, adapterConstructor);
    }

    getDriver(protocol) {
        return this.drivers.get(protocol);
    }
}

VolumeManager.defaults = defaults;

module.exports = VolumeManager;


/**
 * Transform an `obj` into a Map instance.
 *
 * @param {Object} obj Source object
 * @returns {Map}
 */
function asMap(obj = {}) {
    function* entries(obj) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) yield [key, obj[key]];
        }
    }

    return new Map(entries(obj));
}
