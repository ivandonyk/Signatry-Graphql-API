import { Application, NextFunction } from 'express';
import { setApiKey } from '@sendgrid/mail';
import { Request, Response } from '../types/Http';
import { EmailService } from '../sendgrid';

export function addEmailServiceMiddleware(app: Application) {
    app.use((req: Request, resp: Response, next: NextFunction) => {
        req['email'] = new EmailService();
        next();
    });
}
