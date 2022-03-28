/**
 * A JavaScript exception is a value that is
 * thrown as a result of an invalid operation
 * or as the target of a throw statement.
 *
 * While it is not required that these values
 * are instances of Error or classes which
 * inherit from Error, all exceptions thrown
 * by Node.js or the JavaScript runtime will
 * be instances of Error.
 */
class BaseException extends Error {
    /**
     *
     * @param {String} message Message
     * @param {String} code Error code
     * @param {Integer} status Error numeric code
     * @param {Object} data Extra data
     */
    constructor(message, code, status, data) {

        super(message);

        this.name = this.constructor.name;
        this.code = code;
        this.message = message;
        this.status = status;
        this.data = data;

        //TODO: want to hide this from rendering toString
        this.attributes = [
            'message',
            'code',
            'data',
            'status',
            'stack'
        ];

        /**
         * Remove stack in production
         */
        if (process.env.NODE_ENV === 'production' && this.attributes.includes('stack')) {
            this.attributes.splice(this.attributes.indexOf('stack'), 1);
        }
    }

    toJSON() {
        return this.attributes.reduce((json, key) => {
            if (this.hasOwnProperty(key)) json[key] = this[key];
            return json;
        }, {});
    }
}

class FileNotFound extends BaseException {
    constructor(error, path) {
        let message = `File not found at ${path}\n${error.message}`;
        super(message, 'ERR_FILE_NOT_FOUND', 401, { error, path });
    }
}

class OperationNotPermitted extends BaseException {
    constructor(error, path, help) {
        let message = `Operation not permitted for file ${path}\n${error.message}`;
        if (help) message = `${message}\nHint: ${help}`;

        super(message, 'ERR_OPERATION_NOT_PERMITTED', 403, { error, path });
    }
}

class PermissionRequired extends BaseException {
    constructor(error, path) {
        let message = `Missing required permission for file ${path}\n${error.message}`;
        super(message, 'ERR_PERMISSION_REQUIRED', 401, { error, path });
    }
}

class UnknownException extends BaseException {
    constructor(error, path) {
        let message = `Unknown error for file ${path}
    Error: ${error.code || error.name}
    Error message: ${error.message}`;

        super(message, 'ERR_UNKNOWN', 500, { error, path });
    }
}

class UnknownBucket extends BaseException {
    constructor(error, bucket) {
        let message = `The bucket ${bucket} was not found\n${error.message}`;
        super(message, 'ERR_UNKNOWN_BUCKET', 404, { error, bucket });
    }
}

class UnknownVolume extends BaseException {
    constructor(volume) {
        let message = `The volume ${volume} was not found\n${error.message}`;
        super(message, 'ERR_UNKNOWN_VOLUME', 404, { volume });
    }
}

class MissingRequiredArgument extends BaseException {
    constructor(operation, argument) {
        let message = `The "${operation}" requires argument "${argument}"`;
        super(message, 'ERR_MISSING_ARGUMENT', 400, { operation, argument });
    }
}


module.exports = {
    FileNotFound,
    UnknownException,
    UnknownBucket,
    UnknownVolume,
    PermissionRequired,
    OperationNotPermitted,
    MissingRequiredArgument,
};
