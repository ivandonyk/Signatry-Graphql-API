import { parseFromFormat } from '../../utilities/datetime';

export class BAATransaction {
    private transactionId: string;
    private accountId: string;
    private holdingId: string;
    private transactionType: string;
    private amount: number;
    private postedOn: Date;
    private units: number;
    private unitPrice: number;
    private name: string;
    private feeAmount: number;
    private transactionName: string;
    private creationDate: Date;
    private flowAmount: number;
    private flowUnits: number;
    private executionDate: Date;

    constructor(
        transactionId: string,
        accountId: string,
        holdingId: string,
        transactionType: string,
        amount: number,
        postedOn: Date,
        units: number,
        unitPrice: number,
        name: string,
        feeAmount: number,
        transactionName: string,
        creationDate: Date,
        flowAmount: number,
        flowUnits: number,
        executionDate: Date
    ) {
        this.transactionId = transactionId;
        this.accountId = accountId;
        this.holdingId = holdingId;
        this.transactionType = transactionType;
        this.amount = amount;
        this.postedOn = postedOn;
        this.units = units;
        this.unitPrice = unitPrice;
        this.name = name;
        this.feeAmount = feeAmount;
        this.transactionName = transactionName;
        this.creationDate = creationDate;
        this.flowAmount = flowAmount;
        this.flowUnits = flowUnits;
        this.executionDate = executionDate;
    }

    public getTransactionId(): string {
        return this.transactionId;
    }
    public getAccountId(): string {
        return this.accountId;
    }
    public getHoldingId(): string {
        return this.holdingId;
    }
    public getTransactionType(): string {
        return this.transactionType;
    }
    public getAmount(): number {
        return this.amount;
    }
    public getPostedOn(): Date {
        return this.postedOn;
    }
    public getUnits(): number {
        return this.units;
    }
    public getUnitPrice(): number {
        return this.unitPrice;
    }
    public getName(): string {
        return this.name;
    }
    public getFeeAmount(): number {
        return this.feeAmount;
    }
    public getTransactionName(): string {
        return this.transactionName;
    }
    public getCreationDate(): Date {
        return this.creationDate;
    }
    public getFlowAmount(): number {
        return this.flowAmount;
    }
    public getFlowUnits(): number {
        return this.flowUnits;
    }
    public getExecutionDate(): Date {
        return this.executionDate;
    }
}

export class BAATransactionFactory {
    static create(transactionData: any): BAATransaction {
        // validate amount
        if (!transactionData['TOTAL_AMOUNT']) {
            console.log({
                name: transactionData['DESCRIPTION'],
                type: transactionData['TX_TYPE'],
                amount: transactionData['TOTAL_AMOUNT']
            });
        }
        if (
            transactionData['TX_TYPE'] !== 'Transfer' &&
            (typeof transactionData['TOTAL_AMOUNT'] === 'undefined' ||
                transactionData['TOTAL_AMOUNT'] == null)
        ) {
            throw new Error(`Transaction ${transactionData['DESCRIPTION']} is missing an amount`);
        }

        // postedOn, creationDate, and executionDate
        const dateFormat = 'YYYYMMDD';
        const dates: Date[] = ['SETTLEMENT_DATE', 'CREATION_DATE', 'EXECUTION_DATE'].map(field => {
            if (transactionData.hasOwnProperty(field) && transactionData[field] !== null) {
                return parseFromFormat(transactionData[field], dateFormat);
            } else return null;
        });

        return new BAATransaction(
            transactionData['ID'],
            transactionData['ACCOUNT_ID'],
            transactionData['HOLDING_ID'],
            transactionData['TX_TYPE'],
            transactionData['TOTAL_AMOUNT'] ? transactionData['TOTAL_AMOUNT'] : 0,
            dates[0],
            transactionData.hasOwnProperty('UNITS') ? transactionData['UNITS'] : null,
            transactionData.hasOwnProperty('UNIT_PRICE') ? transactionData['UNIT_PRICE'] : null,
            transactionData['DESCRIPTION'],
            transactionData.hasOwnProperty('COMMISSIONS_FEES')
                ? transactionData['COMMISSIONS_FEES']
                : null,
            transactionData['NAME'],
            dates[1],
            transactionData['FLOW_AMOUNT'],
            transactionData['FLOW_UNITS'],
            dates[2]
        );
    }
}
