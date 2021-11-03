const { VolumeManager } = require('..');
const manager = new VolumeManager();
// manager.addVolume('upload', manager.volumeDefinitions.get('s3'));
manager.addVolume('upload', manager.volumeDefinitions.get('fs'));
// const volume = manager.getVolume('s3');
const volume = manager.getVolume('upload');

(async() => {
    try {
        let response;

        response = await volume.write('testing.txt', 'This is a text and nothing more');
        console.log(response)
        response = await volume.exists('testing.txt');
        console.log(response);
        response = await volume.read('testing.txt');
        console.log(response);
        response = await volume.copy('testing.txt', 'testing-copy.txt');
        console.log(response);
        response = await volume.read('testing-copy.txt');
        console.log(response);
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
