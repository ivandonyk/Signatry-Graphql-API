import { CustomerInterface, CustomerCreateResponseInterface } from '../accounting/customer';
import { Functions, Xml } from '@intacct/intacct-sdk';

class IntacctCustomer implements CustomerInterface {
    firstName: string;
    lastName: string;
    email: string;
    customerId: string;

    constructor(firstName: string, lastName: string, email: string, customerId: string) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.customerId = customerId;
    }

    public getFirstName(): string {
        return this.firstName;
    }

    public getLastName(): string {
        return this.lastName;
    }

    public getEmail(): string {
        return this.email;
    }

    public getCustomerId(): string {
        return this.customerId;
    }

    public getCustomerCreateObject(): Functions.AccountsReceivable.CustomerCreate {
        const customer = new Functions.AccountsReceivable.CustomerCreate();
        customer.firstName = this.getFirstName();
        customer.lastName = this.getLastName();
        customer.printAs = `${this.getFirstName()} ${this.getLastName()}`;
        customer.customerName = `${this.getFirstName()} ${this.getLastName()}`;
        customer.primaryEmailAddress = this.getEmail();
        customer.customerId = this.getCustomerId();
        return customer;
    }
}

class IntacctCustomerFactory {
    static create(data: Xml.Response.Result) {
        const customer = new IntacctCustomer(
            data['DISPLAYCONTACT']['FIRSTNAME'],
            data['DISPLAYCONTACT']['LASTNAME'],
            data['DISPLAYCONTACT']['EMAIL1'],
            data['CUSTOMERID']
        );
        return customer;
    }
}

class IntacctCustomerCreateResponse implements CustomerCreateResponseInterface {
    customerId: string;

    constructor(data: Xml.OnlineResponse) {
        this.customerId = data['CUSTOMERID'];
    }

    public getCustomerId(): string {
        return this.customerId;
    }
}

export { IntacctCustomer, IntacctCustomerFactory, IntacctCustomerCreateResponse };
