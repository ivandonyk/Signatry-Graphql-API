interface CustomerInterface {
    getFirstName(): string;
    getLastName(): string;
    getEmail(): string;
    getCustomerId(): string;
}

interface CustomerCreateResponseInterface {
    getCustomerId(): string;
}

export { CustomerInterface, CustomerCreateResponseInterface };
