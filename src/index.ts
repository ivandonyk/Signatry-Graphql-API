import 'reflect-metadata';
import 'newrelic';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { addBodyParserMiddleware } from './middleware/bodyParser';
import { addMorganMiddleware } from './middleware/morgan';
import { addTypeOrmMiddleware } from './middleware/typeorm';
import { addGraphQLMiddleware } from './middleware/graphql';
import { addJwtMiddleware } from './middleware/jwt';
import { addEmailServiceMiddleware } from './middleware/email';
import { addStripeWebhookMiddleware } from './middleware/stripe';
import { addTestMiddleware } from './middleware/test';
import { addRecurringTransactionMiddleWare } from './middleware/recurringTransactions';
import { addIDonateWebhookMiddleware } from './middleware/idonate';
import { setupEventListeners } from './events';
import { setupCronJobs } from './cron';
import { initJobQueue } from './jobs';
import powerbiRoutes from './controllers/powerbiRoutes';

const path = require('path');

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

async function main() {
    try {
        console.log('API server starting...');

        /**
         * Initialize app
         */

        const app = express();
        // secure express
        app.use(helmet());

        /**
         * Add middlewares
         */

        app.use(cors());
        // Powerbi
        app.use('/powerbi', powerbiRoutes);
        app.use('/graphdoc', express.static(path.join(process.cwd(), 'doc')));
        addBodyParserMiddleware(app);
        addMorganMiddleware(app);
        addJwtMiddleware(app);
        addEmailServiceMiddleware(app);
        addTestMiddleware(app);
        addRecurringTransactionMiddleWare(app);
        await addTypeOrmMiddleware(app);
        await addStripeWebhookMiddleware(app);
        await addIDonateWebhookMiddleware(app);
        await addGraphQLMiddleware(app);

        // addGCPMiddleware(app);

        // Setup Cron Jobs
        // If and ONLY if we're in a development environment
        if (
            (process.env.NODE_ENV === 'development' && process.env.CRON_BYPASS !== 'true') ||
            (process.env.NODE_ENV === 'production' && process.env.CRON_BYPASS === 'true')
        ) {
            setupCronJobs();
        }

        initJobQueue();

        /**
         * Setup event listeners
         */
        setupEventListeners();

        /**
         * Listen on :8080
         */

        app.listen(8080, () => console.log('API server started.'));

        /**
         * Debug
         */

        if (process.env.PROFILE_OVERRIDE) {
            console.log('Profile override: ' + process.env.PROFILE_OVERRIDE);
        }
    } catch (ex) {
        console.trace(ex);
    }
}

main();
