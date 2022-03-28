'use strict';
const test = require('tape');
const { VolumeManager } = require('..');


test('VolumeManager: should have default volume name', t => {

    const manager = new VolumeManager();
    t.equals(manager.defaultVolume, VolumeManager.defaults.defaultVolume, 'name matches');
    t.end();
});

test('VolumeManager: should return default volume if no name provided', t => {

    const manager = new VolumeManager();
    const volume = manager.getVolume();
    t.ok(volume, 'get volume returns valid volume');
    t.end();
});

test('VolumeManager: should throw if missing volume', t => {

    const manager = new VolumeManager();
    t.throws(_ => {
        manager.getVolume('NOT_A_REAL_VOLUME');
    }, 'Unknown volumes should throw');

    t.end();
});
