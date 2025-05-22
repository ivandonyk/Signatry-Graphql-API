import { QueryInterface, QueryFilterInterface, QueryFilterGroupInterface } from './query';

interface QueryBuilderInterface {
    createQuery(): QueryInterface;
    createFilter(field: string, value: any, comparison: string): QueryFilterInterface;
    createFilterGroup(): QueryFilterGroupInterface;
}

export { QueryBuilderInterface };
