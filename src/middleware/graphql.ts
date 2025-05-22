import { Application } from 'express';
import graphqlHTTP from 'express-graphql';
import { GraphQLSchema } from 'graphql';
import { graphqlUploadExpress } from 'graphql-upload';
import { createSchema } from '../graphql/schema';

export async function addGraphQLMiddleware(app: Application) {
    const schema = await createSchema();

    const codeFormatter = (name: string) => {
        switch (name) {
            case 'NotPermittedError':
                return 403;
            case 'AccountAlreadyExistsError':
                return 400;
            default:
                return null;
        }
    };

    app.use(
        '/',
        graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
        graphqlHTTP({
            schema: schema,
            graphiql: process.env.NODE_ENV === 'development',
            pretty: true,
            customFormatErrorFn: error => {
                const statusCode = codeFormatter(error.originalError?.name);
                const returnObj = {
                    message: error.message,
                    originalError: error.originalError?.name,
                    locations: error.locations,
                    stack: error.stack ? error.stack.split('\n') : [],
                    path: error.path,
                    ...(statusCode && { statusCode })
                };

                return returnObj;
            }
        })
    );
}
