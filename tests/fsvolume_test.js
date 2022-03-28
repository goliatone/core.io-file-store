'use strict';
const test = require('tape');

const fs = require('fs-extra');
const { join } = require('path');
const { VolumeManager } = require('..');
const FSVolumeDriver = require('..').drivers.fs;


const fixtures = {
    root: join(__dirname, 'fixtures'),
    path(...args) {
        args = [fixtures.root, ...args];
        return join.call(join, ...args);
    },
    file(name) {
        return {
            name: `${name}.test.txt`,
            content: 'This is the content of my text file'
        }
    },
    staticFile: {
        name: 'hello.txt',
        content: 'Macaroon icing gummi bears carrot cake macaroon marshmallow bonbon candy. Cookie chocolate shortbread jelly bear claw chocolate cake. Jelly jelly-o chocolate bar cheesecake lollipop. Dragée pie marshmallow biscuit brownie tootsie roll jelly macaroon'
    }
};

test('VolumeManager: should have fs volume', t => {
    const manager = new VolumeManager();
    const volume = manager.getVolume(FSVolumeDriver.protocol);
    t.ok(volume, 'file system driver found');
    t.end();
});

test('VolumeManager: write', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            [FSVolumeDriver.protocol]: {
                protocol: FSVolumeDriver.protocol,
                config: {
                    root: fixtures.root
                }
            }
        }
    });

    const volume = manager.getVolume(FSVolumeDriver.protocol);

    const file = fixtures.file('write');

    let response = await volume.write(file.name, file.content);

    t.ok(response, 'fs writes file');
    t.ok(response.raw, 'fs should return raw response');
    t.ok(await fs.exists(fixtures.path(file.name)), 'fs should have file');
    t.end();
});


test('VolumeManager: exists', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            [FSVolumeDriver.protocol]: {
                protocol: FSVolumeDriver.protocol,
                config: {
                    root: fixtures.root
                }
            }
        }
    });

    const volume = manager.getVolume(FSVolumeDriver.protocol);

    const file = fixtures.staticFile;
    let response = await volume.exists(file.name);

    t.true(response.exists, 'fs should find files');
    t.ok(response.raw, 'fs should return response');
    t.end();
});

test('VolumeManager: read', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            [FSVolumeDriver.protocol]: {
                protocol: FSVolumeDriver.protocol,
                config: {
                    root: fixtures.root
                }
            }
        }
    });

    const volume = manager.getVolume(FSVolumeDriver.protocol);

    const file = fixtures.staticFile;
    let response = await volume.read(file.name);

    t.equals(response.content, file.content);
    t.ok(response.raw);
    t.end();
});


test('VolumeManager: copy', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            [FSVolumeDriver.protocol]: {
                protocol: FSVolumeDriver.protocol,
                config: {
                    root: fixtures.root
                }
            }
        }
    });

    const volume = manager.getVolume(FSVolumeDriver.protocol);

    const file = fixtures.staticFile;
    await volume.copy(file.name, 'copy.txt');

    let response = await volume.read('copy.txt');

    t.equals(response.content, file.content);
    t.ok(response.raw);
    t.end();
});


test('VolumeManager: move', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            [FSVolumeDriver.protocol]: {
                protocol: FSVolumeDriver.protocol,
                config: {
                    root: fixtures.root
                }
            }
        }
    });

    const volume = manager.getVolume(FSVolumeDriver.protocol);

    const file = fixtures.staticFile;
    await volume.copy('copy.txt', 'moved.txt');

    let response = await volume.read('moved.txt');

    t.equals(response.content, file.content);
    t.ok(response.raw);
    t.end();
});

test('VolumeManager: list', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            [FSVolumeDriver.protocol]: {
                protocol: FSVolumeDriver.protocol,
                config: {
                    root: fixtures.root
                }
            }
        }
    });

    const volume = manager.getVolume(FSVolumeDriver.protocol);

    let response = volume.list('');
    for await (const file of response) {
        t.ok(file.path);
    }

    t.end();
});

test('VolumeManager: delete', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            [FSVolumeDriver.protocol]: {
                protocol: FSVolumeDriver.protocol,
                config: {
                    root: fixtures.root
                }
            }
        }
    });

    const volume = manager.getVolume(FSVolumeDriver.protocol);

    let response = volume.list('');
    for await (const file of response) {
        if (file.path !== fixtures.staticFile.name) {
            let result = await volume.remove(file.path);
            t.deepEqual(result.deleted, true, 'Should delete file');
        }
    }

    t.end();
});

test.onFinish(async _ => {
    await fs.remove('/tmp/buckets');
});
