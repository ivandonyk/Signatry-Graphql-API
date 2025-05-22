import { Stream } from 'stream';

export interface Upload {
    filename: string;
    path: string;
    mimetype: string;
    encoding: string;
    createReadStream: () => Stream;
}
