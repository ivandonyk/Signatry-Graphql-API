import { Application } from 'express';
import jwt from 'express-jwt';
import jwksRsa from 'jwks-rsa';

export function addJwtMiddleware(app: Application) {
    const { JWT_AUDIENCE, JWT_ISSUER, JWKS_URI } = process.env;

    app.use(
        jwt({
            credentialsRequired: false,

            // Dynamically provide a signing key
            // based on the kid in the header and
            // the signing keys provided by the JWKS endpoint.
            secret: jwksRsa.expressJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: JWKS_URI
            }),

            // Validate the audience and the issuer.
            audience: JWT_AUDIENCE,
            issuer: JWT_ISSUER,
            algorithms: ['RS256']
        })
    );
}
