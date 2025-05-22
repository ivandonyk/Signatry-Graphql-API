import axios, { AxiosRequestConfig, AxiosInstance } from 'axios';
import yauzl from 'yauzl';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { create as createXml } from 'xmlbuilder2';
import _ from 'lodash';
import { BAARequest } from './request';
import { BAAResponse, BAAResponseFactory } from './response';

const { BYALLACCOUNTS_API_URL, BYALLACCOUNTS_XML_SCHEMA_URL } = process.env;

export class BAAClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create();
    }

    public async makeRequest(request: BAARequest): Promise<BAAResponse> {
        const requestXml = this.createRequestXml(request);
        console.debug(`API-BAA Request: Payload - ${JSON.stringify(request)}`);
        try {
            const rawResponse = await this.client.post(BYALLACCOUNTS_API_URL, requestXml, {
                headers: { 'Content-Type': 'application/xml', Accept: 'application/zip' },
                responseType: 'arraybuffer'
            });
            const response = await this.processResponse(rawResponse);
            console.debug(`API-BAA Response: Payload - ${JSON.stringify(response)}`);
            if (
                response['DATACONNECTRS'].hasOwnProperty('GENERALRS') &&
                response['DATACONNECTRS']['GENERALRS']['STATUS']['ERRCODE'] !== '0'
            ) {
                throw new Error(response['DATACONNECTRS']['GENERALRS']['STATUS']['ERRMSG']);
            } else if (
                response['DATACONNECTRS'][request.getResponseType()]['STATUS']['ERRCODE'] !== '0'
            ) {
                throw new Error(
                    response['DATACONNECTRS'][request.getResponseType()]['STATUS']['ERRMSG']
                );
            }

            return BAAResponseFactory.create(response);
        } catch (error) {
            console.debug(
                `API-BAA Error: Error making request to ByAllAccounts:  - ${JSON.stringify(error)}`
            );
            throw new Error('Unable to make request to ByAllAccounts');
        }
    }

    private createRequestXml(request: BAARequest): string {
        const requestXmlObj = {
            DATACONNECTRQ: {
                VERSION: 'Version4.0',
                LOGINRQ: {
                    LOGIN_NAME: request.getLoginName(),
                    LOGIN_PW: request.getLoginPass()
                }
            }
        };
        const xml = createXml(requestXmlObj);
        const requestTypeElm = xml
            .find(n => n.node.nodeName === 'DATACONNECTRQ')
            .ele(request.getRequestType());
        const argsObj = request.getArgs();
        if ('GET_DATA_QUERY' in argsObj) {
            const getDataQueryElm = requestTypeElm.ele('GET_DATA_QUERY');
            const dataQuery = argsObj['GET_DATA_QUERY'];
            for (const queryType in dataQuery) {
                const queryTypeElm = getDataQueryElm.ele(queryType);
                for (const queryArg of dataQuery[queryType]) {
                    queryTypeElm.ele(queryArg.key).txt(queryArg.value);
                }
            }
            delete argsObj['GET_DATA_QUERY'];
            for (const include in argsObj) {
                const includeArgs = argsObj[include];
                if (_.isEmpty(includeArgs)) {
                    requestTypeElm.ele(include);
                } else {
                    const includeObj = {};
                    includeObj[include] = argsObj[include].reduce((args, arg) => {
                        args[arg.name] = {};
                        if (arg.value) {
                            args[arg.name] = arg.value;
                        }
                        return args;
                    }, {});
                    requestTypeElm.ele(includeObj);
                }
            }
        } else {
            requestTypeElm.ele(request.getArgs());
        }
        xml.dtd({
            sysID: BYALLACCOUNTS_XML_SCHEMA_URL,
            pubID: '-//DataConnect DTD//DataConnect//EN'
        });
        return xml.toString();
    }

    private async processResponse(response: { data: any }): Promise<any> {
        const tmpZipFilename = '/tmp/BAAresponse.zip';
        const tmpContentFilename = '/tmp/BAAresponse.xml';
        const asyncWriteFile = promisify(fs.writeFile);
        const asyncReadFile = promisify(fs.readFile);
        const asyncDelete = promisify(fs.unlink);
        try {
            // Write API response to .zip file
            const [zipWritten, zipWriteError] = await new Promise(async (resolve, reject) => {
                await asyncWriteFile(tmpZipFilename, response.data).catch(error => {
                    if (error) return resolve([false, error]);
                });
                return resolve([true, undefined]);
            });
            if (!zipWritten) {
                throw zipWriteError;
            }
            // Unzip response file and write to .xml file
            const unzipWriteSteam = fs.createWriteStream(tmpContentFilename);
            const [fileWritten, fileWriteError] = await new Promise((resolve, reject) => {
                yauzl.open(tmpZipFilename, (error, zipFile) => {
                    if (error) {
                        return resolve([false, error]);
                    }
                    zipFile.on('entry', entry => {
                        zipFile.openReadStream(entry, (error, readStream) => {
                            if (error) {
                                return resolve([false, error]);
                            }
                            readStream.on('end', () => resolve([true, undefined]));
                            readStream.pipe(unzipWriteSteam);
                        });
                    });
                });
            });
            if (!fileWritten) {
                await asyncDelete(tmpContentFilename);
                await asyncDelete(tmpZipFilename);
                throw fileWriteError;
            }
            // Read contents from .xml file and create XML object
            const fileContents = await asyncReadFile(tmpContentFilename, 'utf-8');
            const responseXml = createXml(fileContents).end({ format: 'object' });
            // Clean up temp files
            await asyncDelete(tmpContentFilename);
            await asyncDelete(tmpZipFilename);
            return responseXml;
        } catch (error) {
            throw new Error(`Error processing ByAllAccounts response: ${error}`);
        }
    }
}
