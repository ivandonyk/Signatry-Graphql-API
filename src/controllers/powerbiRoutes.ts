import { Router } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import axios from 'axios';
const router = Router();

const {
    REACT_APP_AZURE_CLIENT_ID,
    REACT_APP_AZURE_CLIENT_SECRET,
    REACT_APP_MICROSOFT_TENANT_ID,
    REACT_APP_POWERBI_USERNAME,
    REACT_APP_POWERBI_PASSWORD
} = process.env;

const getAccessToken = async (): Promise<string> => {
    try {
        const cca = new ConfidentialClientApplication({
            auth: {
                clientId: REACT_APP_AZURE_CLIENT_ID || '',
                clientSecret: REACT_APP_AZURE_CLIENT_SECRET || '',
                authority: `https://login.microsoftonline.com/${REACT_APP_MICROSOFT_TENANT_ID}`
            }
        });
        const data = await cca.acquireTokenByUsernamePassword({
            scopes: ['user.read'],
            username: REACT_APP_POWERBI_USERNAME,
            password: REACT_APP_POWERBI_PASSWORD,
            authority: `https://login.microsoftonline.com/${REACT_APP_MICROSOFT_TENANT_ID}`
        });
        console.log('accessToken', data.accessToken);
        return data.accessToken;
    } catch (error) {
        throw error;
    }
};

const getEmbedToken = async (accessToken: string) => {
    try {
        const req = {
            grant_type: 'password',
            client_id: REACT_APP_AZURE_CLIENT_ID,
            client_secret: REACT_APP_AZURE_CLIENT_SECRET,
            username: REACT_APP_POWERBI_USERNAME,
            password: REACT_APP_POWERBI_PASSWORD,
            resource: 'https://analysis.windows.net/powerbi/api',
            scopes: ['https://analysis.windows.net/powerbi/api/.default']
        };
        const params = new URLSearchParams();
        params.append(' grant_type', req.grant_type);
        params.append(' client_id', req.client_id);
        params.append(' client_secret', req.client_secret);
        params.append('resource', req.resource);
        params.append('scopes', JSON.stringify(req.scopes));
        params.append('username', req.username);
        params.append('password', req.password);
        params.append('redirectUri', 'https://signatry-dev.spiredigital.com');

        const { data } = await axios.post(
            `https://login.microsoftonline.com/${REACT_APP_MICROSOFT_TENANT_ID}/oauth2/token`,
            params,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Bearer ${accessToken}`
                },
                withCredentials: true
            }
        );
        console.log('embedToken', data.access_token);
        return data.access_token;
    } catch (error) {
        throw error;
    }
};

router.get('/', async (_, res) => {
    try {
        const accessToken = await getAccessToken();
        const embedToken = await getEmbedToken(accessToken);

        res.status(200).send(embedToken);
    } catch (error) {
        res.send(error);
    }
});

export default router;
