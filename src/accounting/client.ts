import { AccountInterface } from './account';
import { QueryInterface } from './query';
import { JournalEntryInterface, JournalEntryBatchCreateResponseInterface } from './journal-entry';
import { LocationEntityInterface } from './location-entity';
import { CustomerInterface, CustomerCreateResponseInterface } from './customer';
import { ProjectInterface, ProjectCreateResponseInterface } from './project';

interface AccountingClientInterface {
    init(): Promise<this>;
    getAccounts(query: QueryInterface): Promise<AccountInterface[]>;
    getJournalEntries(query: QueryInterface): Promise<JournalEntryInterface[]>;
    getLocationEntities(query: QueryInterface): Promise<LocationEntityInterface[]>;
    createJournalEntryBatch(
        journalEntries: JournalEntryInterface[],
        description: string,
        referenceNumber: string
    ): Promise<JournalEntryBatchCreateResponseInterface>;
    createCustomer(customer: CustomerInterface): Promise<CustomerCreateResponseInterface>;
    getProjects(query: QueryInterface): Promise<ProjectInterface[]>;
    createProject(project: ProjectInterface): Promise<ProjectCreateResponseInterface>;
    updateProject(project: ProjectInterface): Promise<ProjectCreateResponseInterface>;
}

export { AccountingClientInterface };
