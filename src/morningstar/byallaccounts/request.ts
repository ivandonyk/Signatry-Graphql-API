import { BAAUser } from './user';

export enum BAARequestType {
    GET_DATA = 'DATAGETRQ',
    USER_ADD = 'USERADDRQ'
}

export enum BAAResponseType {
    GET_DATA = 'DATAGETRS',
    USER_ADD = 'USERADDRS'
}

export enum BAAQueryType {
    ACCOUNT = 'ACCOUNT_QUERY',
    FINANCIAL_PROFILE = 'FINANCIAL_PROFILE_QUERY',
    PORTFOLIO = 'PORTFOLIO_QUERY',
    USER = 'USER_QUERY'
}

export enum BAAAccountQueryArgs {
    ID = 'ID',
    FINANCIAL_PROFILE = 'FP_ID'
}

type BAAQueryArgs = { key: BAAAccountQueryArgs; value: string }[];

export enum BAAAggregateType {
    ACCOUNT = 'INCACCOUNT',
    ACCOUNT_CREDENTIAL = 'INCACCTCRED',
    FINANCIAL_INSTITUTION = 'INCFI',
    HOLDING = 'INCHOLDING',
    SECURITY = 'INCSECURITY',
    TRANSACTION = 'INCTX',
    USER = 'INCUSER'
}

export enum BAATransactionAggregateArgs {
    START_DATE = 'TX_START_DATE',
    END_DATE = 'TX_END_DATE',
    SETTLEMENT_START_DATE = 'TX_SETTLE_START_DATE',
    SETTLEMENT_END_DATE = 'TX_SETTLE_END_DATE'
}

export enum BAASecurityAggregateArgs {
    DETAIL = 'INCSECDETAIL',
    ASSET_CLASS = 'INCSECAC'
}

export enum BAAHoldingAggregateArgs {
    SOLD_OFF = 'INCHOLDINGSO',
    ASSET_CLASS = 'INCHOLDAC'
}

type BAAAggregateIncludeArgs = {
    name: BAATransactionAggregateArgs | BAASecurityAggregateArgs | BAAHoldingAggregateArgs;
    value?: any;
};

type BAAAggregateInclude = {
    aggregateType: BAAAggregateType;
    args?: BAAAggregateIncludeArgs[];
};

export type BAAQuery = {
    queryType: BAAQueryType;
    args: BAAQueryArgs;
};

export abstract class BAARequest {
    private requestType: BAARequestType;
    private loginName: string;
    private loginPass: string;

    constructor(requestType: BAARequestType, loginName: string, loginPass: string) {
        this.requestType = requestType;
        this.loginName = loginName;
        this.loginPass = loginPass;
    }

    public getRequestType(): BAARequestType {
        return this.requestType;
    }

    public getResponseType(): BAAResponseType {
        if (this.requestType === BAARequestType.GET_DATA) {
            return BAAResponseType.GET_DATA;
        } else if (this.requestType === BAARequestType.USER_ADD) {
            return BAAResponseType.USER_ADD;
        }
    }

    public getLoginName(): string {
        return this.loginName;
    }

    public getLoginPass(): string {
        return this.loginPass;
    }

    public abstract getArgs();
}

export class BAADataGetRequest extends BAARequest {
    private includes: BAAAggregateInclude[];
    private query: BAAQuery;

    constructor(
        includes: BAAAggregateInclude[],
        loginName: string,
        loginPass: string,
        query?: BAAQuery
    ) {
        super(BAARequestType.GET_DATA, loginName, loginPass);
        this.includes = includes;
        if (query) {
            this.query = query;
        }
    }

    public getArgs() {
        const argObj = {};
        const includesObj = this.includes.reduce((obj, include) => {
            obj[include.aggregateType] = include.args ? include.args : {};
            return obj;
        }, {});
        if (this.query) {
            argObj['GET_DATA_QUERY'] = {};
            const queryArgArr = this.query.args.map(arg => {
                return { key: arg.key, value: arg.value };
            });
            argObj['GET_DATA_QUERY'][this.query.queryType] = queryArgArr;
        }
        Object.assign(argObj, includesObj);
        return argObj;
    }
}

export class BAADataGetRequestBuilder {
    private includes: BAAAggregateInclude[];
    private query: BAAQuery;
    private loginName: string;
    private loginPass: string;

    constructor(loginName?: string, loginPass?: string) {
        this.loginName = loginName;
        this.loginPass = loginPass;
        this.includes = [];
        this.query = null;
    }

    public setLoginName(loginName: string): this {
        this.loginName = loginName;
        return this;
    }

    public setLoginPass(loginPass: string): this {
        this.loginPass = loginPass;
        return this;
    }

    public addInclude(aggregateType: BAAAggregateType, args?: BAAAggregateIncludeArgs[]): this {
        const include: BAAAggregateInclude = { aggregateType: aggregateType };
        if (args) {
            if (this.validateIncludeArgsForType(aggregateType, args)) {
                include.args = args;
            } else {
                throw new Error('One or more arguments is not valid for aggregate type');
            }
        }
        this.includes.push(include);
        return this;
    }

    public setQuery(queryType: BAAQueryType, args: BAAQueryArgs): this {
        if (this.validateQueryArgsForType(queryType, args)) {
            const query = { queryType: queryType, args: args };
            console.debug('BAA Query');
            console.debug(query);
            this.query = query;
            return this;
        } else {
            throw new Error('One or more arguments is not valid for aggregate type');
        }
    }

    public build() {
        return new BAADataGetRequest(this.includes, this.loginName, this.loginPass, this.query);
    }

    // Validate that argument for aggregation is for the right type of object
    private validateIncludeArgsForType(
        aggregateType: BAAAggregateType,
        args?: BAAAggregateIncludeArgs[]
    ): boolean {
        let isValid = true;
        switch (aggregateType) {
            case BAAAggregateType.HOLDING:
                isValid = (args as any[]).reduce(
                    (isValid, arg) => {
                        return isValid && Object.values(BAAHoldingAggregateArgs).includes(arg.name);
                    },
                    isValid as boolean
                );
                break;
            case BAAAggregateType.SECURITY:
                isValid = (args as any[]).reduce(
                    (isValid, arg) => {
                        return (
                            isValid && Object.values(BAASecurityAggregateArgs).includes(arg.name)
                        );
                    },
                    isValid as boolean
                );
                break;
            case BAAAggregateType.TRANSACTION:
                isValid = (args as any[]).reduce(
                    (isValid, arg) => {
                        return (
                            isValid && Object.values(BAATransactionAggregateArgs).includes(arg.name)
                        );
                    },
                    isValid as boolean
                );
                break;
            default:
                break;
        }
        return isValid;
    }

    private validateQueryArgsForType(queryType: BAAQueryType, args: BAAQueryArgs): boolean {
        let isValid = true;
        switch (queryType) {
            case BAAQueryType.ACCOUNT:
                isValid = (args as any[]).reduce(
                    (isValid, arg) => {
                        return isValid && Object.values(BAAAccountQueryArgs).includes(arg.key);
                    },
                    isValid as boolean
                );
                break;
        }
        return isValid;
    }
}

export class BAAUserAddRequest extends BAARequest {
    private user: BAAUser;

    constructor(user: BAAUser, adminLoginName: string, adminLoginPass: string) {
        super(BAARequestType.USER_ADD, adminLoginName, adminLoginPass);
        this.user = user;
    }

    public getArgs() {
        return {
            PERSON: {
                ROLE: this.user.getRole(),
                FIRST_NAME: this.user.getFirstName(),
                LAST_NAME: this.user.getLastName(),
                EMAIL_ADDRESS: this.user.getEmail()
            },
            LOGIN: {
                LOGIN_NAME: this.user.getLoginName(),
                LOGIN_PW: this.user.getLoginPass()
            }
        };
    }
}
