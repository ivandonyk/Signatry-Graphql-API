import { parseBAATimestampToUTC, parseFromFormat } from '../../utilities/datetime';

export class BAAHolding {
    private holdingId: string;
    private accountId: string;
    private name: string;
    private units: number;
    private date: Date;
    private marketValue: number;
    private unitPrice: number;
    private priceAsOf: Date;
    private securityId: string;
    private assetClass: string;
    private assetSubclass: string;

    constructor(
        holdingId: string,
        accountId: string,
        name: string,
        units: number,
        date: Date,
        marketValue: number,
        unitPrice: number,
        priceAsOf: Date,
        securityId: string,
        assetClass: string,
        assetSubclass: string
    ) {
        this.holdingId = holdingId;
        this.accountId = accountId;
        this.name = name;
        this.units = units;
        this.date = date;
        this.marketValue = marketValue;
        this.unitPrice = unitPrice;
        this.priceAsOf = priceAsOf;
        this.securityId = securityId;
        this.assetClass = assetClass;
        this.assetSubclass = assetSubclass;
    }

    public getHoldingId(): string {
        return this.holdingId;
    }

    public getAccountId(): string {
        return this.accountId;
    }

    public getName(): string {
        return this.name;
    }

    public getDate(): Date {
        return this.date;
    }

    public getUnits(): number {
        return this.units;
    }

    public getMarketValue(): number {
        return this.marketValue;
    }

    public getUnitPrice(): number {
        return this.unitPrice;
    }

    public getPriceAsOf(): Date {
        return this.priceAsOf;
    }

    public getSecurityId(): string {
        return this.securityId;
    }

    public getAssetClass(): string {
        return this.assetClass;
    }

    public getAssetSubclass(): string {
        return this.assetSubclass;
    }
}

export class BAAHoldingFactory {
    static create(holdingData: any): BAAHolding {
        let parsedDate: Date;
        let parsedPriceAsOfDate: Date;

        /** @todo get confirmation that we want to default to today */
        if (holdingData.hasOwnProperty('LAST_UPDATED')) {
            parsedDate = parseBAATimestampToUTC(holdingData['LAST_UPDATED']);
        } else {
            console.log('no date provided for: ', holdingData);
            parsedDate = new Date();
        }

        if (holdingData.hasOwnProperty('PRICE_DATA_AS_OF')) {
            parsedPriceAsOfDate = parseFromFormat(holdingData['PRICE_DATA_AS_OF'], 'YYYYMMDD');
        } else {
            parsedPriceAsOfDate = new Date();
        }
        return new BAAHolding(
            holdingData['ID'],
            holdingData['ACCOUNT_ID'],
            holdingData['NAME'],
            holdingData.hasOwnProperty('UNITS')
                ? holdingData['UNITS']
                : holdingData['MARKET_VALUE'],
            parsedDate,
            holdingData['MARKET_VALUE'],
            holdingData.hasOwnProperty('UNIT_PRICE') ? holdingData['UNIT_PRICE'] : 1.0,
            parsedPriceAsOfDate,
            holdingData['SECURITY_ID'],
            holdingData['ASSET_CLASS'],
            holdingData['ASSET_SUBCLASS']
        );
    }
}
