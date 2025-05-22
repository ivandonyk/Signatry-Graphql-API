import { Application } from 'express';
import { ErrorReporting } from '@google-cloud/error-reporting';

export function addGCPMiddleware(app: Application) {
    if (process.env.LOGGING === 'false') return;

    const errors = new ErrorReporting({ reportMode: 'always' });

    app.use(errors.express);
}
