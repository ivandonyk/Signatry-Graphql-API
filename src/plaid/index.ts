import { Client, environments } from 'plaid';

//Get Plaid environment variables
const { PLAID_CLIENT_ID, PLAID_SECRET, PLAID_PUBLIC_KEY, PLAID_ENV } = process.env;

//Create Plaid client
export const plaidClient = new Client(
    PLAID_CLIENT_ID,
    PLAID_SECRET,
    PLAID_PUBLIC_KEY,
    environments[PLAID_ENV]
);
