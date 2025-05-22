import { Application } from 'express';
import { Request } from '../types/Http';
import bodyParser from 'body-parser';

export async function addBodyParserMiddleware(app: Application) {
    app.use(
        bodyParser.json({
            verify: (req: Request, res, buf) => {
                req.rawBody = buf;
            }
        })
    );
}
