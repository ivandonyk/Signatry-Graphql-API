import {
    createConnection as _createConnection,
    getConnection,
    ConnectionOptions,
    Connection
} from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as models from './models';
import * as subscribers from './subscribers';

const {
    DATABASE_CONNECTION_HOST,
    DATABASE_CONNECTION_PORT,
    DATABASE_CONNECTION_USERNAME,
    DATABASE_CONNECTION_PASSWORD,
    DATABASE_CONNECTION_DATABASE,
    DATABASE_QUERY_LOGGING,
    DATABASE_CONNECTION_MAX
} = process.env;

export const CONNECTION_OPTIONS: ConnectionOptions = {
    type: 'postgres',
    host: DATABASE_CONNECTION_HOST,
    port: +DATABASE_CONNECTION_PORT,
    username: DATABASE_CONNECTION_USERNAME,
    password: DATABASE_CONNECTION_PASSWORD,
    database: DATABASE_CONNECTION_DATABASE,
    synchronize: false,
    entities: Object.values(models),
    subscribers: Object.values(subscribers),
    namingStrategy: new SnakeNamingStrategy(),
    poolErrorHandler: error => {
        console.log(`CONNECTION POOL ERROR ON ${DATABASE_CONNECTION_DATABASE}: ${error}`);
    },
    extra: {
        idleTimeoutMillis: 1000,
        max: DATABASE_CONNECTION_MAX || 50
    },
    logging: ['warn', 'error']
};

interface GetOrCreateConnectionOptions {
    logging?: boolean;
}

export async function createConnection(
    options?: GetOrCreateConnectionOptions
): Promise<Connection> {
    const queryLogging = options ? options.logging : DATABASE_QUERY_LOGGING === 'true';
    return await _createConnection({
        ...CONNECTION_OPTIONS,
        logging: queryLogging
    });
}

export async function getOrCreateConnection(options?: GetOrCreateConnectionOptions) {
    try {
        return await getConnection();
    } catch (error) {
        return await createConnection(options);
    }
}
