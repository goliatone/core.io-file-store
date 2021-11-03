'use strict';

const VolumeManager = require('.').VolumeManager;

module.exports = function(context, config) {
    const logger = context.getLogger(config.moduleid);
    logger.info('Initializing module %s', config.moduleid);


    return context.resolve(config.dependencies, true).then(async _ => {
        const volumeManager = new VolumeManager(config);

        return volumeManager;
    });
};
