import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { Storage } from '@google-cloud/storage';
const bucket = new Storage().bucket('charity-photos');
const [ein, ...paths] = process.argv.slice(2);
import { getOrCreateConnection } from '../../typeorm';
import { Recipient } from '../../models';
import { BASE as STORAGE_BASE_URL, BUCKETS } from '../../storage/client';

(async () => {
    const errors = [];

    Promise.all(
        paths.map(async path => {
            const filename = uuid() + '.jpg';
            const file = bucket.file(filename);

            return new Promise((resolve, reject) => {
                fs.createReadStream(path)
                    .pipe(file.createWriteStream())
                    .on('error', err => {
                        errors.push(err);
                        reject(err);
                    })
                    .on('finish', async () => {
                        console.log(`Uploaded ${filename}`);
                        resolve(`${STORAGE_BASE_URL}/${BUCKETS.charityPhotos}/${filename}`);
                    });
            });
        })
    ).then(async (urls: string[]) => {
        if (errors.length) console.log(errors);

        const connection = await getOrCreateConnection({ logging: true });
        const repo = connection.getRepository(Recipient);

        const recipient = await repo.findOne({ ein });

        recipient.photos.push(...urls);

        await repo.save(recipient);

        process.exit(0);
    });
})();
