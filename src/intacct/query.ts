import {
    QueryInterface,
    QueryFilterInterface,
    QueryFilterGroupInterface
} from '../accounting/query';

type Operator = 'and' | 'or';
type Comparison = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'like' | 'notLike' | 'in' | 'notIn';

class IntacctQueryFilter implements QueryFilterInterface {
    private field: string;
    private value: any;
    private comparison: Comparison;

    constructor(field: string, value: any, comparison: Comparison = '=') {
        this.field = field;
        this.value = value;
        this.comparison = comparison;
    }

    public getField(): string {
        return this.field;
    }

    public getComparison(): string {
        return this.comparison;
    }

    public getValue(): any {
        return this.value;
    }
}

class IntacctQueryFilterGroup implements QueryFilterGroupInterface {
    private filters: IntacctQueryFilter[];
    private children: IntacctQueryFilterGroup[];
    private operator: Operator;
    private negate: boolean;

    constructor(operator: Operator = 'and', negate = false) {
        this.operator = operator;
        this.negate = negate;
        this.filters = [];
        this.children = [];
    }

    public getFilters(): Array<IntacctQueryFilter> {
        return this.filters;
    }

    public addFilter(filter: IntacctQueryFilter): this {
        this.filters.push(filter);
        return this;
    }

    public getChildren(): Array<IntacctQueryFilterGroup> {
        return this.children;
    }

    public addChild(filterGroup: IntacctQueryFilterGroup): this {
        this.children.push(filterGroup);
        return this;
    }

    public getOperator(): Operator {
        return this.operator;
    }

    public getNegate(): boolean {
        return this.negate;
    }
}

class IntacctQuery implements QueryInterface {
    private fields: string[];
    private page: number;
    private limit: number;
    private filter: IntacctQueryFilterGroup = null;

    constructor(fields: string[] = [], page = 1, limit = 100) {
        this.fields = fields;
        this.page = page;
        this.limit = limit;
    }

    public getFields() {
        return this.fields;
    }

    public setFields(fields: string[]): this {
        this.fields = fields;
        return this;
    }

    public setFilter(filter: IntacctQueryFilterGroup): this {
        this.filter = filter;
        return this;
    }

    public getFilter(): IntacctQueryFilterGroup {
        return this.filter;
    }

    public getPage(): number {
        return this.page;
    }

    public setPage(page: number): this {
        this.page = page;
        return this;
    }

    public getLimit(): number {
        return this.limit;
    }

    public setLimit(limit: number): this {
        this.limit = limit;
        return this;
    }
}

export { IntacctQuery, IntacctQueryFilter, IntacctQueryFilterGroup, Comparison, Operator };
