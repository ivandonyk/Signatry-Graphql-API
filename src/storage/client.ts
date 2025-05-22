import { Storage as gStorage, File, Bucket } from '@google-cloud/storage';
import { v4 as uuid } from 'uuid';

import { Document } from '../models/Document';
import { DocumentTypes } from '../types/documentTypes';

export const BASE = 'https://storage.googleapis.com';
export const BUCKETS = {
    charityPhotos: 'charity-photos',
    userPhotos: 'ts-user-photos',
    fundPhotos: 'ts-fund-photos',
    documentsGlobal: 'ts-documents',
    // get bucket name from base url (without the port or sub domains)
    documents: `ts-documents-${
        process.env.BASE_URL.split('/')[2]
            .split(':')[0]
            .split('.')[0]
    }`
};

const storage = new gStorage();

class Storage {
    buckets: { [name: string]: string };

    constructor() {
        this.buckets = { ...BUCKETS };
    }

    // @todo implement within other methods
    private async getBucket(bucketName: string): Promise<Bucket> {
        const bucket = storage.bucket(bucketName);
        const [exists] = await bucket.exists();

        if (exists) return bucket;
        else {
            const [newBucket] = await storage.createBucket(bucketName);
            return newBucket;
        }
    }

    async uploadFundPhotos(images: any) {
        return Promise.all(
            images.map(async image => {
                const { filename, createReadStream } = await image;
                const name = uuid() + `.${filename.split('.').pop()}`;
                const file = storage.bucket(this.buckets.fundPhotos).file(name);

                return new Promise((resolve, reject) => {
                    createReadStream()
                        .pipe(file.createWriteStream())
                        .on('error', err => {
                            console.error('// ON ERROR');
                            console.error(err);
                            reject(err);
                        })
                        .on('finish', async () => {
                            console.log(`uploaded ${name}`);
                            resolve(`${BASE}/${this.buckets.fundPhotos}/${name}`);
                        });
                });
            })
        );
    }

    async uploadUserPhotos(images: any) {
        return Promise.all(
            images.map(async image => {
                const { filename, createReadStream } = await image;
                const name = uuid() + `.${filename.split('.').pop()}`;
                const file = storage.bucket(this.buckets.userPhotos).file(name);

                return new Promise((resolve, reject) => {
                    createReadStream()
                        .pipe(file.createWriteStream())
                        .on('error', err => {
                            console.error('// ON ERROR');
                            console.error(err);
                            reject(err);
                        })
                        .on('finish', async () => {
                            console.log(`uploaded ${name}`);
                            resolve(`${BASE}/${this.buckets.userPhotos}/${name}`);
                        });
                });
            })
        );
    }

    async uploadPhotos(images: any) {
        return Promise.all(
            images.map(async image => {
                const { filename, createReadStream } = await image;
                const name = uuid() + `.${filename.split('.').pop()}`;
                const file = storage.bucket(this.buckets.charityPhotos).file(name);
                return new Promise((resolve, reject) => {
                    createReadStream()
                        .pipe(file.createWriteStream())
                        .on('error', err => {
                            console.error('// ON ERROR');
                            console.error(err);
                            reject(err);
                        })
                        .on('finish', async () => {
                            console.log(`uploaded ${name}`);
                            resolve(`${BASE}/${this.buckets.charityPhotos}/${name}`);
                        });
                });
            })
        );
    }

    private async extractDocument(file: File): Promise<Document | false> {
        const splitPath = file.name.split('/');
        const fileName = splitPath[splitPath.length - 1];

        // filter out parent directory
        if (!fileName) return Promise.resolve(false);

        const today = new Date();
        const [data] = await file.getMetadata();
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: today.setDate(today.getDate() + 1) // 24 hours
        });

        return {
            fileName,
            createdOn: data.timeCreated,
            url,
            type: data.metadata?.type
        };
    }

    private filterDocuments(docs: any[]): Document[] {
        return docs.filter(Boolean);
    }

    async getDocuments(modelType: 'users' | 'funds', code: string): Promise<Document[] | void> {
        let documents: Document[];

        try {
            const [files] = await storage.bucket(BUCKETS.documents).getFiles({
                prefix: `${modelType}/${code}/`,
                autoPaginate: false
            });

            if (files.length) {
                documents = await Promise.all(files.map(this.extractDocument)).then(
                    this.filterDocuments
                );
            }
        } catch (error) {
            console.error(`Error fetching documents. type: ${modelType} code: ${code}`, error);
        }

        return documents;
    }

    async getDocument(
        prefix: 'users' | 'funds' | 'forms',
        name: DocumentTypes,
        bucket: string = BUCKETS.documents
    ): Promise<Document | void> {
        let documents: Document[];

        try {
            const [files] = await storage.bucket(bucket).getFiles({
                prefix: `${prefix}/${name}.pdf`
            });

            if (files.length) {
                documents = await Promise.all(files.map(this.extractDocument)).then(
                    this.filterDocuments
                );
            }
        } catch (error) {
            console.error(`Error fetching document "${name}"`, error);
        }

        // return first document or `void`
        return documents ? documents[0] : null;
    }

    async savePDFFromBuffer(buffer: Buffer, filePath: string, fileName: string) {
        const bucket = await this.getBucket(BUCKETS.documents);
        const file = bucket.file(filePath + '/' + fileName);

        try {
            await file.save(buffer, {
                metadata: { contentType: 'application/pdf' }
            });
        } catch (error) {
            console.log(`error saving pdf "${fileName}" at "${filePath}"`, error);
        }
    }
}

export default Storage;
