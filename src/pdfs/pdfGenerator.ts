import puppeteer, {
    Browser,
    LaunchOptions,
    BrowserLaunchArgumentOptions,
    BrowserConnectOptions
} from 'puppeteer';

import StorageClient from '../storage/client';

let browser: Browser;
export const pdfGenerator = async (filePath: string, fileName: string, html: string) => {
    try {
        if (!browser) {
            const args: LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions = {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-software-rasterizer',
                    '--headless',
                    '--disable-gpu',
                    '--disable-dev-shm-usage'
                ],
                headless: true,
                ...(process.env.NODE_ENV !== 'development'
                    ? { executablePath: '/usr/bin/chromium-browser' }
                    : {})
            };

            browser = await puppeteer.launch(args);

            browser.on('error', err => console.log('puppeteer "error" event fired: ', err));
            browser.on('pageerror', err => console.log('puppeteer "pageerror" event fired: ', err));
        }

        // create a new page
        const page = await browser.newPage();

        // set html
        await page.setContent(html, {
            waitUntil: 'domcontentloaded'
        });

        // create a pdf buffer
        const buffer = await page.pdf();

        // save pdf
        const client = new StorageClient();
        await client.savePDFFromBuffer(buffer, filePath, fileName);

        // close the browser
        await page.close();
    } catch (err) {
        console.log('Puppeteer error', err);
        await browser.close();
        browser = null;
    }
};
