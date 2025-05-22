import { AccountingClientInterface } from '../accounting';
import { IntacctQuery, IntacctQueryFilter, IntacctQueryFilterGroup } from './query';
import { IntacctAccount, IntacctAccountFactory } from './account';
import { IntacctLocationEntity, IntacctLocationEntityFactory } from './location-entity';
import {
    IntacctJournalEntry,
    IntacctJournalEntryFactory,
    IntacctJournalEntryBatchCreateResponse
} from './journal-entry';
import { IntacctCustomer, IntacctCustomerFactory, IntacctCustomerCreateResponse } from './customer';
import { IntacctProject, IntacctProjectFactory, IntacctProjectCreateResponse } from './project';
import {
    OnlineClient,
    ClientConfig,
    SessionProvider,
    Functions,
    RequestConfig,
    Xml
} from '@intacct/intacct-sdk';

const {
    INTACCT_SENDER_ID,
    INTACCT_SENDER_PASSWORD,
    INTACCT_COMPANY_ID,
    INTACCT_USER_ID,
    INTACCT_USER_PASSWORD
} = process.env;

export class IntacctClient implements AccountingClientInterface {
    client: OnlineClient;

    public async init(): Promise<this> {
        if (process.env.INTACCT_ENABLED) {
            this.client = await this.initClient();
            return this;
        } else {
            throw new Error('Intacct integration is not enabled on this environment. Set INTACCT_ENABLED=true to enable.');
        }
    }

    public async getAccounts(query: IntacctQuery): Promise<IntacctAccount[]> {
        const readQuery = this.createReadQuery(query);
        readQuery.objectName = 'GLACCOUNT';
        try {
            const response: Xml.OnlineResponse = await this.client.execute(readQuery);
            const accounts = response.results[0].data.map(result => {
                return IntacctAccountFactory.create(result);
            });
            return accounts;
        } catch (error) {
            console.log(error);
        }
    }

    public async createAccount(account: IntacctAccount): Promise<void> {
        try {
            this.client.execute(account.getAccountCreateObject());
        } catch (error) {}
    }

    public async getJournalEntries(query: IntacctQuery): Promise<IntacctJournalEntry[]> {
        const readQuery = this.createReadQuery(query);
        readQuery.objectName = 'GLENTRY';
        try {
            const response: Xml.OnlineResponse = await this.client.execute(readQuery);
            const entries = response.results[0].data.map(result => {
                return IntacctJournalEntryFactory.create(result);
            });
            return entries;
        } catch (error) {
            console.log(error);
        }
    }

    public async createJournalEntryBatch(
        journalEntries: IntacctJournalEntry[],
        description: string,
        referenceNumber: string
    ): Promise<IntacctJournalEntryBatchCreateResponse> {
        try {
            const entryLines = journalEntries.map((journalEntry: IntacctJournalEntry) => {
                const line = journalEntry.getJournalEntryCreateLineObject();
                return line;
            });

            const journalEntryBatchCreate = new Functions.GeneralLedger.JournalEntryCreate();
            journalEntryBatchCreate.lines = entryLines;
            const today = new Date();
            journalEntryBatchCreate.postingDate = today;
            journalEntryBatchCreate.description = description;
            journalEntryBatchCreate.referenceNumber = referenceNumber;
            journalEntryBatchCreate.journalSymbol = 'GJ';

            const responseData = await this.client.execute(journalEntryBatchCreate);
            const response = new IntacctJournalEntryBatchCreateResponse(
                responseData.results[0].data[0]
            );
            return response;
        } catch (error) {
            console.log(error);
        }
    }

    public async getLocationEntities(query: IntacctQuery): Promise<IntacctLocationEntity[]> {
        const readQuery = this.createReadQuery(query);
        readQuery.objectName = 'LOCATION'; // LOCATION gets subsidiaries. If top-level entity needed, use 'LOCATIONENTITY'
        try {
            const response = await this.client.execute(readQuery);
            const entities = response.results[0].data.map(result => {
                return IntacctLocationEntityFactory.create(result);
            });
            return entities;
        } catch (error) {
            console.log(error);
        }
    }

    public async createCustomer(customer: IntacctCustomer): Promise<IntacctCustomerCreateResponse> {
        try {
            const customerCreate = customer.getCustomerCreateObject();
            const response = await this.client.execute(customerCreate);
            return new IntacctCustomerCreateResponse(response.results[0].data[0]);
        } catch (error) {
            console.log(error);
        }
    }

    public async getProjects(query: IntacctQuery): Promise<IntacctProject[]> {
        const readQuery = this.createNewQuery(query);
        readQuery.assignFromObject('PROJECT');
        try {
            const response = await this.client.execute(readQuery);
            const entities = response.results[0].data.map(result => {
                return IntacctProjectFactory.create(result);
            });
            return entities;
        } catch (error) {
            console.log(error);
        }
    }

    public async createProject(project: IntacctProject): Promise<IntacctProjectCreateResponse> {
        try {
            const projectCreate = project.getProjectCreateObject();
            const response = await this.client.execute(projectCreate);
            return new IntacctProjectCreateResponse(response.results[0].data[0]);
        } catch (error) {
            console.log(error);
        }
    }

    public async updateProject(project: IntacctProject): Promise<IntacctProjectCreateResponse> {
        try {
            const projectUpdate = project.getProjectUpdateObject();
            const response = await this.client.execute(projectUpdate);
            return new IntacctProjectCreateResponse(response.results[0].data[0]);
        } catch (error) {
            console.log(error);
        }
    }

    private async getSessionConfig(): Promise<ClientConfig> {
        const clientConfig = new ClientConfig();
        clientConfig.senderId = INTACCT_SENDER_ID;
        clientConfig.senderPassword = INTACCT_SENDER_PASSWORD;
        clientConfig.companyId = INTACCT_COMPANY_ID;
        clientConfig.userId = INTACCT_USER_ID;
        clientConfig.userPassword = INTACCT_USER_PASSWORD;

        return await SessionProvider.factory(clientConfig);
    }

    private async initClient(): Promise<OnlineClient> {
        const sessionConfig = await this.getSessionConfig();
        const client = new OnlineClient(sessionConfig);
        return client;
    }

    private createReadQuery(query: IntacctQuery): Functions.Common.ReadByQuery {
        const readByQuery = new Functions.Common.ReadByQuery();
        readByQuery.pageSize = query.getLimit();
        if (query.getFilter() !== null) {
            readByQuery.query = this.processFilters(query.getFilter());
        }
        readByQuery.fields = query.getFields();
        return readByQuery;
    }

    private createNewQuery(query: IntacctQuery): Functions.Common.NewQuery.Query {
        const newQuery = new Functions.Common.NewQuery.Query();
        newQuery.assignPageSize(query.getLimit());
        newQuery.assignOffset((query.getPage() - 1) * query.getLimit());
        const selectFields = new Functions.Common.NewQuery.QuerySelect.SelectBuilder().addFields(
            query.getFields()
        ).selects;
        newQuery.assignSelectFields(selectFields);
        if (query.getFilter().getFilters().length > 1) {
            const operator = this.processNewQueryOperator(query.getFilter());
            newQuery.assignFilter(operator);
        } else if (query.getFilter().getFilters().length == 1) {
            const filter = this.processNewQueryFilters(query.getFilter().getFilters()).pop();
            newQuery.assignFilter(filter);
        }
        return newQuery;
    }

    private processNewQueryOperator(
        filterGroup: IntacctQueryFilterGroup
    ): Functions.Common.NewQuery.QueryFilter.AbstractOperator {
        let operator: Functions.Common.NewQuery.QueryFilter.AbstractOperator;
        if (filterGroup.getOperator() == 'and') {
            operator = new Functions.Common.NewQuery.QueryFilter.AndOperator();
        } else if (filterGroup.getOperator() == 'or') {
            operator = new Functions.Common.NewQuery.QueryFilter.OrOperator();
        }
        const filters = this.processNewQueryFilters(filterGroup.getFilters());
        filters.forEach(filter => {
            operator.addFilter(filter);
        });
        return operator;
    }

    private processNewQueryFilters(
        filters: IntacctQueryFilter[]
    ): Functions.Common.NewQuery.QueryFilter.Filter[] {
        const queryFilters = filters.map((filter: IntacctQueryFilter) => {
            const queryFilter = new Functions.Common.NewQuery.QueryFilter.Filter(filter.getField());
            const filterComparison = filter.getComparison();
            const filterValue = filter.getValue();
            if (filterComparison === '=' && filterValue !== null) {
                queryFilter.equalTo(filterValue);
            } else if (filterComparison === '=' && filterValue === null) {
                queryFilter.isNull();
            } else if (filterComparison === '!=' && filterValue !== null) {
                queryFilter.notEqualTo(filterValue);
            } else if (filterComparison === '!=' && filterValue === null) {
                queryFilter.isNotNull();
            } else if (filterComparison === '<') {
                queryFilter.lessThan(filterValue);
            } else if (filterComparison === '<=') {
                queryFilter.lessThanOrEqualTo(filterValue);
            } else if (filterComparison === '>') {
                queryFilter.greaterThan(filterValue);
            } else if (filterComparison === '>=') {
                queryFilter.greaterThanOrEqualTo(filterValue);
            } else if (filterComparison === 'like') {
                queryFilter.like(filterValue);
            } else if (filterComparison === 'notLike') {
                queryFilter.notLike(filterValue);
            } else if (filterComparison === 'in') {
                queryFilter.in(filterValue);
            } else if (filterComparison === 'notIn') {
                queryFilter.notIn(filterValue);
            }
            return queryFilter;
        });
        return queryFilters;
    }

    private processFilters(
        filterGroup: IntacctQueryFilterGroup
    ): Functions.Common.Query.Logical.ILogical {
        let logical: Functions.Common.Query.Logical.AbstractLogical;
        if (filterGroup.getOperator() == 'and') {
            logical = new Functions.Common.Query.Logical.AndCondition();
        } else if (filterGroup.getOperator() == 'or') {
            logical = new Functions.Common.Query.Logical.OrCondition();
        }
        logical.conditions = [];
        logical.negate = filterGroup.getNegate();
        filterGroup.getFilters().forEach((filter: IntacctQueryFilter): void => {
            const comparison = this.getComparison(filter);
            logical.conditions.push(comparison);
        });
        filterGroup.getChildren().forEach((childGroup: IntacctQueryFilterGroup): void => {
            logical.conditions.push(this.processFilters(childGroup));
        });
        return logical;
    }

    private getComparison(
        filter: IntacctQueryFilter
    ): Functions.Common.Query.Comparison.IComparison {
        const filterComparison = filter.getComparison();
        const filterValueType = typeof filter.getValue();
        if (filterComparison == '=') {
            if (filterValueType == 'string') {
                const comparison = new Functions.Common.Query.Comparison.EqualTo.EqualToString();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            } else if (filterValueType == 'number') {
                const comparison = new Functions.Common.Query.Comparison.EqualTo.EqualToNumber();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            } else if (filter.getValue() == null) {
                const comparison = new Functions.Common.Query.Comparison.EqualTo.EqualToNull();
                comparison.field = filter.getField();
                return comparison;
            } else if (filter.getValue() instanceof Date) {
                const comparison = new Functions.Common.Query.Comparison.EqualTo.EqualToDate();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            }
        } else if (filterComparison == '>') {
            if (filterValueType == 'string') {
                const comparison = new Functions.Common.Query.Comparison.GreaterThan.GreaterThanString();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            } else if (filterValueType == 'number') {
                const comparison = new Functions.Common.Query.Comparison.GreaterThan.GreaterThanNumber();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            } else if (filter.getValue() instanceof Date) {
                const comparison = new Functions.Common.Query.Comparison.GreaterThan.GreaterThanDate();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            }
        } else if (filterComparison == '>=') {
            if (filterValueType == 'string') {
                const comparison = new Functions.Common.Query.Comparison.GreaterThanOrEqualTo.GreaterThanOrEqualToString();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            } else if (filterValueType == 'number') {
                const comparison = new Functions.Common.Query.Comparison.GreaterThanOrEqualTo.GreaterThanOrEqualToNumber();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            } else if (filter.getValue() instanceof Date) {
                const comparison = new Functions.Common.Query.Comparison.GreaterThanOrEqualTo.GreaterThanOrEqualToDate();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            }
        } else if (filterComparison == '<') {
            if (filterValueType == 'string') {
                const comparison = new Functions.Common.Query.Comparison.LessThan.LessThanString();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            } else if (filterValueType == 'number') {
                const comparison = new Functions.Common.Query.Comparison.LessThan.LessThanNumber();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            } else if (filter.getValue() instanceof Date) {
                const comparison = new Functions.Common.Query.Comparison.LessThan.LessThanDate();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            }
        } else if (filterComparison == '<=') {
            if (filterValueType == 'string') {
                const comparison = new Functions.Common.Query.Comparison.LessThanOrEqualTo.LessThanOrEqualToString();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            } else if (filterValueType == 'number') {
                const comparison = new Functions.Common.Query.Comparison.LessThanOrEqualTo.LessThanOrEqualToNumber();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            } else if (filter.getValue() instanceof Date) {
                const comparison = new Functions.Common.Query.Comparison.LessThanOrEqualTo.LessThanOrEqualToDate();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            }
        } else if (filterComparison == 'like') {
            if (filterValueType == 'string') {
                const comparison = new Functions.Common.Query.Comparison.Like.LikeString();
                comparison.field = filter.getField();
                comparison.value = filter.getValue();
                return comparison;
            }
        } else if (filterComparison == 'in') {
            if (
                filter.getValue() instanceof Array &&
                filter.getValue().length > 0 &&
                typeof filter.getValue()[0] == 'number'
            ) {
                const comparison = new Functions.Common.Query.Comparison.InArray.InArrayInteger();
                comparison.field = filter.getField();
                comparison.valuesList = filter.getValue();
                return comparison;
            } else if (
                filter.getValue() instanceof Array &&
                filter.getValue().length > 0 &&
                typeof filter.getValue()[0] == 'string'
            ) {
                const comparison = new Functions.Common.Query.Comparison.InArray.InArrayString();
                comparison.field = filter.getField();
                comparison.valuesList = filter.getValue();
                return comparison;
            }
        } else {
            // Throw invalid filter exception
        }
    }
}
