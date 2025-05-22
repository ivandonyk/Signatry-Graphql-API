import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { setupEventListeners } from './events';
import { addBodyParserMiddleware } from './middleware/bodyParser';
import { addCronMiddleware } from './middleware/cron';
import { addTypeOrmMiddleware } from './middleware/typeorm';

async function main() {
    setupEventListeners();
    const app = express();
    addBodyParserMiddleware(app);
    addTypeOrmMiddleware(app);
    addCronMiddleware(app);
    const server = app.listen(8080, () => console.log('Cron runner started'));
    server.setTimeout(1200000);
}
main();
