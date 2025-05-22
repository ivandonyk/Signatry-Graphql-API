export class BAASecurity {
    private securityId: string;
    private name: string;
    private tickerSymbol: string;
    private assetClass: string;
    private assetSubclass: string;
    private securityType: string;
    private cusip: string;

    constructor(
        securityId: string,
        name: string,
        tickerSymbol: string,
        securityType: string,
        cusip: string
    ) {
        this.securityId = securityId;
        this.name = name;
        this.tickerSymbol = tickerSymbol;
        this.securityType = securityType;
        this.cusip = cusip;
    }

    public getSecurityId(): string {
        return this.securityId;
    }

    public getName(): string {
        return this.name;
    }

    public getTickerSymbol(): string {
        return this.tickerSymbol;
    }

    public getSecurityType(): string {
        return this.securityType;
    }

    public getCUSIP(): string {
        return this.cusip;
    }
}

export class BAASecurityFactory {
    static create(securityData: any): BAASecurity {
        return new BAASecurity(
            securityData['ID'],
            securityData['NAME'],
            securityData['TICKER'],
            securityData['SECTYPE'],
            securityData['CUSIP']
        );
    }
}
