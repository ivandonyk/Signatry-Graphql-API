export enum BAAUserRole {
    INVESTOR = 'INVESTOR',
    ADVISOR = 'ADVISOR',
    ASSISTANT = 'ASSISTANT',
    CONSULTANT = 'CONSULTANT'
}

export class BAAUser {
    private userId: string;
    private loginName: string;
    private loginPass: string;
    private email: string;
    private firstName: string;
    private lastName: string;
    private role: BAAUserRole;
    private financialProfileId: string;

    constructor(
        email?: string,
        firstName?: string,
        lastName?: string,
        role?: BAAUserRole,
        loginName?: string,
        loginPass?: string,
        userId?: string,
        financialProfileId?: string
    ) {
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.role = role;
        this.loginName = loginName;
        this.loginPass = loginPass;
        this.userId = userId;
        this.financialProfileId = financialProfileId;
    }

    public getUserId(): string {
        return this.userId;
    }

    public getLoginName(): string {
        return this.loginName;
    }

    public getLoginPass(): string {
        return this.loginPass;
    }

    public getEmail(): string {
        return this.email;
    }

    public getFirstName(): string {
        return this.firstName;
    }

    public getLastName(): string {
        return this.lastName;
    }

    public getRole(): string {
        return this.role;
    }

    public getFinancialProfileId(): string {
        return this.financialProfileId;
    }
}

export class BAAUserFactory {
    static create(data: any) {
        return new BAAUser(null, null, null, null, null, null, data['ID'], data['FP_ID']);
    }
}
