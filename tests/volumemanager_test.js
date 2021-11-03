'use strict';
const test = require('tape');
const { VolumeManager } = require('..');


test('VolumeManager: should have default volume', t => {

    const manager = new VolumeManager();
    t.equals(manager.defaultVolume, 'local');

    t.end();
});

test('VolumeManager: should have default volume', t => {

    const manager = new VolumeManager();
    const volume = manager.getVolume();
    t.end();
});
