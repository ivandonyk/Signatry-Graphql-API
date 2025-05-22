import { Application, Request } from 'express';
import morgan from 'morgan';

export function addMorganMiddleware(app: Application) {
    if (process.env.LOGGING === 'false') return;

    app.use(morgan('dev'));

    morgan.token('graphql-query', (req: Request) => {
        const { variables, operationName } = req.body;
        const gqlLogLevel = `GRAPHQL: 
        Operation Name: ${operationName} 
        Variables: ${JSON.stringify(variables)}
        Heap Used: ${process.memoryUsage().heapUsed} 
        Heap Total: ${process.memoryUsage().heapTotal}\n`;

        return gqlLogLevel;
    });

    app.use(morgan(':graphql-query'));
}
