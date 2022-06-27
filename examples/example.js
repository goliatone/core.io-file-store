const fs = require('fs-extra');
const { VolumeManager } = require('..');
const manager = new VolumeManager();
// manager.addVolume('upload', manager.volumeDefinitions.get('s3'));
manager.addVolume('upload', manager.volumeDefinitions.get('fs'));
// const volume = manager.getVolume('s3');
const volume = manager.getVolume('upload');

(async() => {
    try {
        let fixture = {
            path: 'testing.text',
            content: 'This is a text and nothing more'
        }
        let response;

        response = await volume.write(fixture.path, fixture.content);
        console.log(response)

        response = await volume.exists('testing.txt');
        console.log(response);

        response = await volume.read('testing.txt');
        console.log(response);

        response = await volume.copy('testing.txt', 'testing-copy.txt');
        console.log(response);

        response = await volume.read('testing-copy.txt');
        console.log(response);

        response = await volume.read('testing-copy.txt', { asBuffer: true });
        writeAsStream(response, 'testing-stream.txt');

        response = await volume.move('testing-copy.txt', 'retesting.txt');
        console.log(response);

        response = volume.list();
        for await (const file of response) console.log(file);

        response = volume.list();
        for await (const file of response) {
            await volume.remove(file.path);
        }

    } catch (error) {
        console.log(error);
    }
})();

function writeAsStream(response, filepath) {
    return new Promise((resolve, reject) => {
        let stream = fs.createWriteStream(filepath);
        stream.write(response.content);
        stream.on('end', _ => {
            stream.end();
            resolve();
        });
        stream.on('error', reject);
    });
}

// let params = {
//     "Bucket": bucket,
//     "Delete": {
//         "Objects": []
//     }
// };
// let files = this.list(filepath);
// for await (const file of files) {
//     params.Delete.Objects.push()
// }
