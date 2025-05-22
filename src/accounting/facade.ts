import {
    AccountingClientInterface,
    AccountInterface,
    CustomerInterface,
    LocationEntityInterface,
    ProjectInterface,
    JournalEntryInterface,
    QueryBuilderInterface,
    QueryInterface
} from '../accounting';

import {
    IntacctClient,
    IntacctQueryBuilder,
    IntacctCustomer,
    IntacctProject,
    IntacctJournalEntry
} from '../intacct';

// This class provides a singular entry point for all accounting integration functions
// Provides a layer of separation/delegation between application code and accounting code
class AccountingFacade {
    client: AccountingClientInterface;
    queryBuilder: QueryBuilderInterface;

    constructor() {
        this.client = null;
        this.queryBuilder = new IntacctQueryBuilder();
    }

    private async getClient(): Promise<AccountingClientInterface> {
        if (this.client === null) {
            this.client = await new IntacctClient().init();
        }
        return this.client;
    }

    public async getAllAccounts(): Promise<AccountInterface[]> {
        let page = 1;
        const pageSize = 1000;
        const query = this.queryBuilder
            .createQuery()
            .setFields(['ACCOUNTNO', 'TITLE'])
            .setPage(page)
            .setLimit(pageSize);
        const client = await this.getClient();
        let accounts = await client.getAccounts(query);
        let findMore = accounts.length == pageSize; // If we got as many accounts as allowed, there may yet be more
        while (findMore) {
            query.setPage(++page);
            accounts = accounts.concat(await this.client.getAccounts(query));
            findMore = accounts.length == pageSize * page;
        }
        return accounts;
    }

    public async getAllLocationEntities(): Promise<LocationEntityInterface[]> {
        let page = 1;
        const pageSize = 1000;
        const query = this.queryBuilder
            .createQuery()
            .setFields(['LOCATIONID', 'NAME'])
            .setPage(page)
            .setLimit(pageSize);
        const client = await this.getClient();
        let entities = await client.getLocationEntities(query);
        let findMore = entities.length == pageSize; // If we got as many entities as allowed, there may yet be more
        while (findMore) {
            query.setPage(++page);
            entities = entities.concat(await client.getLocationEntities(query));
            findMore = entities.length == pageSize * page;
        }
        return entities;
    }

    public async getAllProjects(): Promise<ProjectInterface[]> {
        let page = 1;
        const pageSize = 1000;
        const queryBuilder = new IntacctQueryBuilder();
        const filterGroup = queryBuilder.createFilterGroup();
        filterGroup.addFilter(queryBuilder.createFilter('PROJECTTYPE', 'DAF - Fund', '='));
        const query = this.queryBuilder
            .createQuery()
            .setFields(['PROJECTID', 'NAME'])
            .setFilter(filterGroup)
            .setPage(page)
            .setLimit(pageSize);
        const client = await this.getClient();
        let projects = await client.getProjects(query);
        let findMore = projects.length == pageSize; // If we got as many projects as allowed, there may yet be more
        while (findMore) {
            query.setPage(++page);
            projects = projects.concat(await client.getProjects(query));
            findMore = projects.length == pageSize * page;
        }
        return projects;
    }

    public async getProjectByName(name: string): Promise<ProjectInterface> {
        const queryBuilder = new IntacctQueryBuilder();
        const filterGroup = queryBuilder.createFilterGroup();
        filterGroup.addFilter(queryBuilder.createFilter('NAME', name, '='));
        const query = this.queryBuilder
            .createQuery()
            .setFields(['PROJECTID', 'NAME'])
            .setFilter(filterGroup);
        const client = await this.getClient();
        const projects = await client.getProjects(query);
        return projects.pop();
    }

    public async createCustomer(
        firstName: string,
        lastName: string,
        email: string,
        customerId?: string
    ): Promise<string> {
        if (!customerId) {
            customerId = new Date()
                .getTime()
                .toString()
                .substr(-10);
        }
        const customer = new IntacctCustomer(firstName, lastName, email, customerId);
        const client = await this.getClient();
        const response = await client.createCustomer(customer);
        return response.getCustomerId();
    }

    public async createProject(name: string, projectId?: string): Promise<string> {
        if (!projectId) {
            projectId = new Date()
                .getTime()
                .toString()
                .substr(-10);
        }
        const project = new IntacctProject(name, projectId);
        const client = await this.getClient();
        const response = await client.createProject(project);
        return response.getProjectId();
    }

    public async updateProject(projectId: string, name: string): Promise<string> {
        const project = new IntacctProject(name, projectId);
        const client = await this.getClient();
        const response = await client.updateProject(project);
        return response.getProjectId();
    }

    public createJournalEntryObject(
        accountId: string,
        description: string,
        amount: number,
        transactionId: string,
        projectId: string,
        customerId: string,
        locationEntityId: string,
        vendorId: string = null,
        customFields: [string, any][] = []
    ): JournalEntryInterface {
        const entry = new IntacctJournalEntry(
            accountId,
            description,
            amount,
            transactionId,
            projectId,
            customerId,
            locationEntityId,
            vendorId,
            customFields
        );
        return entry;
    }

    public async createJournalEntryBatch(
        entries: JournalEntryInterface[],
        description: string,
        referenceNumber: string
    ): Promise<string> {
        const client = await this.getClient();
        const response = await client.createJournalEntryBatch(
            entries,
            description,
            referenceNumber
        );
        return response.getBatchId();
    }
}

export { AccountingFacade };
