'use strict';

const fs = require('fs');
const fsx = require('fs-extra');
const { resolve, sep, join, dirname, relative } = require('path');

const extend = require('gextend');
const pipeline = require('util').promisify(require('stream').pipeline);

const {

    FileNotFound,

    UnknownException,
    OperationNotPermitted
} = require('../exceptions');

const defaults = {
    autoinitialize: true,
    logger: extend.shim(console),
    root: '/tmp'
};

class FSVolumeDriver {
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

        extend(this, config);

        //TODO: move to setter/ getter
        this.root = resolve(this.root);
    }

    /**
     * Determine if the file located at
     * `filepath` exists in this volume.
     * 
     * @param {String} filepath 
     * @returns {Promise<Boolean>}
     */
    async exists(filepath) {
        try {
            filepath = this._normalize(filepath);

            const result = await fsx.pathExists(filepath);

            return { result };
        } catch (error) {
            throw buildError(error, filepath);
        }
    }

    /**
     * Put `content`s in the given target.
     * 
     * It will create a new file and necessary
     * directories.
     * 
     * @param {String} target Filepath in volume 
     * @param {Buffer|string} content Content
     */
    async write(target, content) {
        const filepath = this._normalize(target);
        try {

            if (isStream(content, true)) {
                const dir = dirname(filepath);
                await fsx.ensureDir(dir);
                const writeStream = fsx.createWriteStream(filepath);
                await pipeline(content, writeStream);
                return {};
            }

            const raw = await fsx.outputFile(filepath, content);
            return { raw };
        } catch (error) {
            //TODO: handle errors
            throw buildError(error, filepath, target);
        }
    }

    /**
     * Get the content at a given path.
     * 
     * @param {String} filepath File path in volume
     */
    async read(filepath, encoding = 'utf-8') {
        try {
            filepath = this._normalize(filepath);
            const result = await fsx.readFile(filepath, encoding);
            return { content: result, raw: result };
        } catch (error) {
            throw buildError(error, filepath);
        }
    }

    /**
     * copy `source` file to a new file at
     * `target` destination.
     * 
     * @param {String} source Source file path
     * @param {String} target Target file path
     * @param {Object} options Options
     */
    async copy(source, target, options = {}) {
        try {
            source = this._normalize(source);
            target = this._normalize(target);
            const raw = await fsx.copy(source, target);
            return { raw };
        } catch (error) {
            throw buildError(error, source, target);
        }
    }

    /**
     * 
     * @param {String} source Source
     * @param {String} target Target
     * @param {Object} options
     * @param {Object} [options.overwrite=true]
     * @returns 
     */
    async move(source, target, options = {}) {
        options = Object.assign({ overwrite: true }, options);

        try {
            source = this._normalize(source);
            target = this._normalize(target);
            const raw = await fsx.move(source, target, options);
            return { raw };
        } catch (error) {
            throw buildError(error, `${source} -> ${target}`);
        }
    }

    /**
     * Remove either a file or directory.
     * 
     * @param {String} filepath 
     * @returns 
     */
    async remove(filepath) {
        //TODO: disable removing virtual root and filesystem root!!!
        try {
            filepath = this._normalize(filepath);
            const raw = await fsx.remove(filepath);
            return { raw, deleted: true };
        } catch (error) {
            e = buildError(error, filepath);
            if (e instanceof FileNotFound) {
                return { raw: undefined, deleted: false };
            }

            throw e;
        }
    }

    /**
     * This method generates an iterator we can use
     * to go over the contents of a directory.
     * @param {String} path
     */

    list(pattern) {
        const normalized = this._normalize(pattern);
        return this._dirIterator(normalized, pattern);
    }

    async * _dirIterator(pattern, originalPattern) {
        const prefixDirectory = pattern[pattern.length - 1] === sep ? pattern : dirname(pattern);
        try {
            console.log('prefixDirectory', prefixDirectory)
            const dir = await fs.opendir(prefixDirectory);
            for await (const file of dir) {
                const filename = join(prefixDirectory, file.name);
                //TODO: use minimatch
                if (filename.startsWith(pattern)) {
                    if (file.isDirectory()) {
                        yield* this._dirIterator(join(filename, sep), originalPattern);
                    } else if (file.isFile()) {
                        const path = relative(this.root, filename);
                        yield {
                            raw: null,
                            path
                        };
                    }
                }
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw buildError(error, originalPattern);
            }
        }
    }

    /**
     * This will normalize the provided 
     * `filepath` and translate it to a
     * value inside our volume.
     * 
     * @param {String} filepath File path
     * @returns {String} Volume file path
     */
    _normalize(filepath = '') {
        return join(this.root, filepath);
    }
}

FSVolumeDriver.defaults = defaults;

module.exports = FSVolumeDriver;

function isStream(stream, readable = true) {
    if (!stream) return false;
    if (typeof stream !== 'object') return false;

    const _is = (src, type) => typeof src === type;

    return _is(stream.pipe, 'function') &&
        _is(stream._read, 'function') &&
        _is(stream._readableState, 'object') &&
        stream.readable === readable;
};


function buildError(error, location) {
    if (error.message.indexOf('dest already exists') === 0) {
        return new OperationNotPermitted(error, location, 'Use overwrite option.');
    }

    switch (error.code) {
        case 'ENOENT':
            return new FileNotFound(error, location);
        case 'EPERM':
            return new OperationNotPermitted(error, location);
        default:
            return new UnknownException(error, location);
    }
}
