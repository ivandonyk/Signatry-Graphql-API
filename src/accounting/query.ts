// Used to group comparisons e.g. condition1 AND (condition2 OR condition3)
// Can be nested for more complex conditions
interface QueryFilterGroupInterface {
    getOperator(): string;
    getFilters(): QueryFilterInterface[];
    addFilter(filter: QueryFilterInterface): this;
    getChildren(): QueryFilterGroupInterface[];
    addChild(filterGroup: QueryFilterGroupInterface): this;
    getNegate(): boolean;
}

// Encapsulates "<field> <comparison> <value>" e.g. field1 > value1
interface QueryFilterInterface {
    getField(): string;
    getValue(): any;
    getComparison(): string;
}

// Encapsulates query object
interface QueryInterface {
    getFields(): string[];
    setFields(fields: string[]): this;
    getFilter(): QueryFilterGroupInterface;
    setFilter(filter: QueryFilterGroupInterface): this;
    getPage(): number;
    setPage(page: number): this;
    getLimit(): number;
    setLimit(limit: number): this;
}

export { QueryInterface, QueryFilterInterface, QueryFilterGroupInterface };
