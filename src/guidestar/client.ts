import axios, { AxiosRequestConfig, AxiosInstance } from 'axios';

const { GUIDESTAR_ESSENTIALS_KEY, GUIDESTAR_PREMIER_KEY } = process.env;

export interface GuideStarGetCharityDataResponse {
    summary: { [key: string]: any };
    charitycheck: { [key: string]: any };
    operations: { [key: string]: any };
    financials: { [key: string]: any };
}

class GuideStarClient {
    essentials: AxiosInstance;
    premier: AxiosInstance;

    constructor() {
        // create axios instance for Essentials API
        this.essentials = axios.create();

        // create axios instance for Premier API
        this.premier = axios.create();

        // bind API key headers
        this.essentials.interceptors.request.use((config: AxiosRequestConfig) => {
            config.headers['Subscription-Key'] = GUIDESTAR_ESSENTIALS_KEY;
            return config;
        });

        this.premier.interceptors.request.use((config: AxiosRequestConfig) => {
            config.headers['Subscription-Key'] = GUIDESTAR_PREMIER_KEY;
            return config;
        });
    }

    /**
     * Text search via GuideStar Essentials API
     * @param term
     */

    async search(term: string) {
        try {
            // const response = await this.essentials.post(
            //     'https://apidata.guidestar.org/essentials/v2',
            //     { search_terms: term }
            // );

            // if (response.data && response.data.code === 200) {
            //     return response.data.data.hits;
            // }

            return [];
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    /**
     * Get charity data via GuideStar Premier API
     * @param ein
     */

    async getCharityData(ein: string): Promise<GuideStarGetCharityDataResponse | null> {
        try {
            ein = this.formatEin(ein);

            const response = await this.premier.get(
                `https://apidata.guidestar.org/premier/v3/${ein}`
            );

            if (response.data && response.data.code === 200) {
                return {
                    summary: response.data.data.summary,
                    charitycheck: response.data.data.charitycheck,
                    operations: response.data.data.operations,
                    financials: response.data.data.financials
                };
            }

            return null;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    /**
     * Get charity data via GuideStar Premier API
     * Note getCharityData() is badly written and should throw exceptions. Dont
     * @param ein
     */
    // uncomment for and used by seedSelectCharities()
    // async getCharityDataClean(ein: string): Promise<GuideStarGetCharityDataResponse | null> {
    //     ein = this.formatEin(ein);

    //     const response = await this.premier.get(`https://apidata.guidestar.org/premier/v3/${ein}`);

    //     if (response.data && response.data.code === 200) {
    //         return {
    //             summary: response.data.data.summary,
    //             charitycheck: response.data.data.charitycheck,
    //             operations: response.data.data.operations,
    //             financials: response.data.data.financials
    //         };
    //     }

    //     throw new Error(`GuideStarClient returned code: ${response.data.code}`);
    // }

    private formatEin(ein: string): string {
        ein = ein.replace(/-/g, '');

        if (ein.length !== 9) {
            throw new Error('Invalid EIN format');
        }

        return [ein.slice(0, 2), '-', ein.slice(2)].join('');
    }
}

export default GuideStarClient;
