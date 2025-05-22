import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Connection, EntityManager } from 'typeorm';
import { EmailService } from '../sendgrid/index';
import { RequestTransactionContext } from '../context';

export type Request = ExpressRequest &
    RequestTransactionContext & {
        // add typeorm connection to request type
        typeorm: Connection;
        // add raw request body to request type
        rawBody: Buffer;
        // add email service to request type
        email: EmailService;
    };
export type Response = ExpressResponse;
