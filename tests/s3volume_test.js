'use strict';
const test = require('tape');

const fs = require('fs-extra');
const { join } = require('path');
const { VolumeManager } = require('..');

const AWSMock = require('mock-aws-s3');
// Can configure a basePath for your local buckets
AWSMock.config.basePath = '/tmp/buckets';

const file = {
    name: 'testing.tx',
    content: 'This is a text and nothing more'
};

test('VolumeManager: should have s3 volume', t => {
    const manager = new VolumeManager();
    const volume = manager.getVolume('s3');
    t.ok(volume, 's3');
    t.end();
});

test('VolumeManager: write', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            s3: {
                protocol: 's3',
                config: {
                    root: '/s3',
                    bucket: 'write',
                    clientFactory(config) {
                        return AWSMock.S3({
                            params: { Bucket: 'write' }
                        });
                    }
                }
            }
        }
    });
    const volume = manager.getVolume('s3');

    let response = await volume.write(file.name, file.content);

    t.ok(response, 's3');
    t.ok(response.raw);
    t.ok(await fs.exists(join(response.raw.Bucket, response.raw.Key)));
    t.end();
});


test('VolumeManager: exists', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            s3: {
                protocol: 's3',
                config: {
                    root: '/s3',
                    bucket: 'write',
                    clientFactory(config) {
                        return AWSMock.S3({
                            params: { Bucket: 'write' }
                        });
                    }
                }
            }
        }
    });
    const volume = manager.getVolume('s3');

    let response = await volume.exists(file.name);
    t.true(response.exists, 's3');
    t.ok(response.raw);
    t.end();
});

test('VolumeManager: read', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            s3: {
                protocol: 's3',
                config: {
                    root: '/s3',
                    bucket: 'write',
                    clientFactory(config) {
                        return AWSMock.S3({
                            params: { Bucket: 'write' }
                        });
                    }
                }
            }
        }
    });
    const volume = manager.getVolume('s3');

    let response = await volume.read(file.name);
    t.equals(response.content, file.content);
    t.ok(response.raw);
    t.end();
});


test('VolumeManager: copy', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            s3: {
                protocol: 's3',
                config: {
                    root: '/s3',
                    bucket: 'write',
                    clientFactory(config) {
                        return AWSMock.S3({
                            params: { Bucket: 'write' }
                        });
                    }
                }
            }
        }
    });
    const volume = manager.getVolume('s3');

    await volume.copy(file.name, 'copy.txt');
    let response = await volume.read('copy.txt');
    t.equals(response.content, file.content);
    t.ok(response.raw);
    t.end();
});

test('VolumeManager: move', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            s3: {
                protocol: 's3',
                config: {
                    root: '/s3',
                    bucket: 'write',
                    clientFactory(config) {
                        return AWSMock.S3({
                            params: { Bucket: 'write' }
                        });
                    }
                }
            }
        }
    });
    const volume = manager.getVolume('s3');

    await volume.copy('copy.txt', 'moved.txt');
    let response = await volume.read('moved.txt');
    t.equals(response.content, file.content);
    t.ok(response.raw);
    t.end();
});

test.skip('VolumeManager: list', async t => {
    const manager = new VolumeManager({
        volumeDefinitions: {
            s3: {
                protocol: 's3',
                config: {
                    root: '/s3',
                    bucket: 'write',
                    clientFactory(config) {
                        return AWSMock.S3({
                            params: { Bucket: 'write' }
                        });
                    }
                }
            }
        }
    });
    const volume = manager.getVolume('s3');

    let response = volume.list('');
    for await (const file of response) {
        console.log(file);
    }

    t.ok(response.raw);
    t.end();
});

test.onFinish(async _ => {
    await fs.remove('/tmp/buckets');
});
