const { SnakeNamingStrategy } = require('typeorm-naming-strategies');
const dotenv = require('dotenv');
const path = require('path');

let MIGRATIONS_FOLDER;
if (process.env.NODE_ENV === 'production') {
    MIGRATIONS_FOLDER = 'src/migrations/**/*.js';
} else {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
    MIGRATIONS_FOLDER = 'dist/src/migrations/**/*.js';
}

const {
    DATABASE_CONNECTION_TYPE,
    DATABASE_CONNECTION_HOST,
    DATABASE_CONNECTION_PORT,
    DATABASE_CONNECTION_USERNAME,
    DATABASE_CONNECTION_PASSWORD,
    DATABASE_CONNECTION_DATABASE
} = process.env;

const config = {
    type: 'postgres',
    host: DATABASE_CONNECTION_HOST,
    port: +DATABASE_CONNECTION_PORT,
    username: DATABASE_CONNECTION_USERNAME,
    password: DATABASE_CONNECTION_PASSWORD,
    database: DATABASE_CONNECTION_DATABASE,
    synchronize: false,
    logging: false,
    migrations: [MIGRATIONS_FOLDER],
    cli: {
        migrationsDir: 'src/migrations'
    },
    entities: [MIGRATIONS_FOLDER],
    namingStrategy: new SnakeNamingStrategy()
};

module.exports = config;
