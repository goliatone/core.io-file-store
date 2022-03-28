'use strict';

const { sep, join } = require('path');

const {
    UnknownBucket,
    FileNotFound,
    PermissionRequired,
    UnknownException,
    MissingRequiredArgument
} = require('../exceptions');

const extend = require('gextend');

const defaults = {
    autoinitialize: true,
    logger: extend.shim(console),

    root: process.env.NODE_S3_VOLUME_ROOT || '',
    bucket: process.env.NODE_S3_VOLUME_BUCKET,

    /**
     * Configuration options needed by
     * AWS S3 client library.
     */
    clientOptions: Object.assign({
        region: process.env.AWS_ACCESS_REGION || 'us-east-1'
    }, process.env.AWS_DEV_ENDPOINT ? {
        endpoint: process.env.AWS_DEV_ENDPOINT,
        s3ForcePathStyle: true,
        signatureVersion: 'v4'
    } : {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }),
    clientFactory(config) {
        const AWS = require('aws-sdk');
        AWS.config.update(config);
        return new AWS.S3();
    }
};

class S3VolumeDriver {
    /**
     *
     * @param {Object} config
     * @param {Boolean} [config.autoinitialize=true]
     * @param {Object} [config.logger=NodeJS.console]
     * @param {Function} [config.clientFactory]
     * @param {String} [config.root=process.env.NODE_S3_VOLUME_ROOT]
     * @param {String} [config.bucket=process.env.NODE_S3_VOLUME_BUCKET]
     * @param {Object} config.clientOptions
     * @param {String} [config.clientOptions.region=us-east1]
     * @param {String} [config.clientOptions.endpoint]
     * @param {Boolean} [config.clientOptions.s3ForcePathStyle]
     * @param {String} [config.clientOptions.signatureVersion]
     * @param {String} [config.clientOptions.accessKeyId]
     * @param {String} [config.clientOptions.secretAccessKey]
     */
    constructor(config = {}) {
        config = extend({}, this.constructor.defaults, config);
        if (config.autoinitialize) {
            this.init(config);
        }
    }

    /**
     *
     * @param {Object} config
     * @param {Boolean} [config.autoinitialize=true]
     * @param {Object} [config.logger=NodeJS.console]
     * @param {String} [config.root=process.env.NODE_S3_VOLUME_ROOT]
     * @param {String} [config.bucket=process.env.NODE_S3_VOLUME_BUCKET]
     * @param {Object} config.clientOptions
     * @param {String} [config.clientOptions.region=us-east1]
     * @param {String} [config.clientOptions.endpoint]
     * @param {Boolean} [config.clientOptions.s3ForcePathStyle]
     * @param {String} [config.clientOptions.signatureVersion]
     * @param {String} [config.clientOptions.accessKeyId]
     * @param {String} [config.clientOptions.secretAccessKey]
     * @param {Function} [config.clientFactory]
     */
    init(config = {}) {
        if (this.initialized) return;
        this.initialized = true;

        config = extend({}, this.constructor.defaults, config);

        extend(this, config);

        if (!this.client) {
            this.client = this.clientFactory(config.clientOptions);
        }
    }

    /**
     * Put `content`s in the given target.
     *
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
     * @param {String} target Filepath in volume
     * @param {Buffer|String|NodeJS.ReadableStream} content Content
     * @param {Object} options
     * @param {Object} options.params Passed to client as operation options
     */
    async write(target, content, options = {}) {
        let params = {
            Key: this._normalize(target),
            Body: content,
            Bucket: this.bucket
        };

        params = Object.assign(params, options.params);

        try {
            const raw = await this.client.upload(params).promise();
            return { raw };
        } catch (error) {
            throw buildError(error, target, this.bucket);
        }
    }

    /**
     * Determine if the file located at
     * `filepath` exists in this volume.
     *
     * @param {String} filepath
     * @param {Object} options
     * @param {Object} options.params Passed to client as operation options
     * @returns {Promise<Boolean>}
     */
    async exists(filepath, options = {}) {
        let params = {
            Key: this._normalize(filepath),
            Bucket: this.bucket
        };
        params = Object.assign(params, options.params);

        try {
            const result = await this.client.headObject(params).promise();
            return { exists: true, raw: result };
        } catch (error) {
            if (error.statusCode === 404) {
                return { exists: false, raw: error };
            } else {
                throw buildError(error, filepath, this.bucket);
            }
        }
    }

    /**
     * Get the content at a given path.
     *
     * @param {String} filepath File path in volume
     * @param {Object} options
     * @param {Object} options.params Will be passed to client request
     * @param {Boolean} [options.asBuffer=false] Returns content as buffer if true
     * @param {String} [options.encoding=utf-8]
     */
    async read(filepath, options = {}) {
        let params = {
            Key: this._normalize(filepath),
            Bucket: this.bucket
        };
        params = Object.assign(params, options.params);

        try {
            const result = await this.client.getObject(params).promise();

            let content = result.Body;

            if (options.asBuffer !== true) {
                content = content.toString(options.encoding || 'utf-8');
            }

            return { content, raw: result };
        } catch (error) {
            throw buildError(error, filepath, this.bucket);
        }
    }

    /**
     * copy `source` file to a new file at
     * `target` destination.
     *
     * @param {String} source Source file path
     * @param {String} target Target file path
     * @param {Object} options
     * @param {Object} options.params Passed to client as operation options
     */
    async copy(source, target, options = {}) {
        let params = {
            Key: this._normalize(target),
            Bucket: this.bucket,
            CopySource: join(sep, this.bucket, this._normalize(source))
        };
        params = Object.assign(params, options.params);

        try {
            const result = await this.client.copyObject(params).promise();
            return { raw: result };
        } catch (error) {
            throw buildError(error, `${source}->${target}`, this.bucket);
        }
    }

    /**
     *
     * @param {String} source Source
     * @param {String} target Target
     * @param {Object} options
     * @param {Object} options.params Passed to client as operation options
     * @returns
     */
    async move(source, target, options = {}) {
        try {
            await this.copy(source, target, options);
            await this.remove(source, options);
            return {};
        } catch (error) {
            throw buildError(error, `${source}->${target}`, this.bucket);
        }
    }

    /**
     * Remove either a file or directory.
     * TODO: If we wanted to do removeDir we would need to list and then `deleteObjects`
     * @param {String} filepath
     * @param {Object} options
     * @param {Object} options.params Passed to client as operation options
     * @returns
     */
    async remove(filepath, options = {}) {

        if (!filepath) {
            throw new MissingRequiredArgument('remove', 'filepath');
        }

        //TODO: always use deleteObjects
        //TODO: just iterate over filepath
        let params = {
            Key: this._normalize(filepath),
            Bucket: this.bucket
        };
        params = Object.assign(params, options.params);

        try {
            //TODO: Check if filepath is array and if so use deleteObjects
            const result = await this.client.deleteObject(params).promise();
            // Amazon does not inform the client if anything was deleted.
            return { raw: result, deleted: null };
        } catch (error) {
            throw buildError(error, filepath, this.bucket);
        }
    }

    /**
     * This method generates an iterator we can use
     * to go over the contents of a directory.
     * TODO: Include a way to handle pagination: StartAfter
     *
     * @see https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html#API_ListObjectsV2_RequestSyntax
     * @param {String} prefix Limits the response to keys that
     *                        begin with the specified prefix.
     * @param {Object} options
     * @param {Object} options.params Passed to client as
     *                                operation options
     */
    async * list(prefix, options = {}) {

        let continuationToken;

        do {
            try {
                let params = {
                    Bucket: this.bucket,
                    Prefix: this._normalize(prefix),
                    ContinuationToken: continuationToken,
                    MaxKeys: 1000,
                };
                params = Object.assign(params, options.params);

                const response = await this.client
                    .listObjectsV2(params)
                    .promise();

                continuationToken = response.NextContinuationToken;

                for (const file of response.Contents) {
                    yield {
                        raw: file,
                        path: this._denormalize(file.Key),
                    }
                }
            } catch (error) {
                throw buildError(error, prefix, this.bucket);
            }
        } while (continuationToken);
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
        if (filepath.indexOf(this.root) === 0) return filepath;
        return join(this.root || '', filepath);
    }

    _denormalize(key = '') {
        return key.replace(this.root, '').replace(/^\/|\/$/g, '');
    }
}

S3VolumeDriver.protocol = 's3';
S3VolumeDriver.defaults = defaults;

module.exports = S3VolumeDriver;

function buildError(error, path, bucket) {
    switch (error.name) {
        case 'NoSuchBucket':
            return new UnknownBucket(error, bucket);
        case 'NoSuchKey':
            return new FileNotFound(error, path);
        case 'AllAccessDisabled':
            return new PermissionRequired(error, path);
        default:
            return new UnknownException(error, path);
    }
}
