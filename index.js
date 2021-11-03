module.exports.VolumeManager = require('./lib/volumemanager');

module.exports.drivers = {
    fs: require('./lib/drivers/fs'),
    s3: require('./lib/drivers/s3'),
};

module.exports.init = require('./init');
