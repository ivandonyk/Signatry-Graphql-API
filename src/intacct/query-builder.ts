import { QueryBuilderInterface } from '../accounting/query-builder';
import {
    IntacctQuery,
    IntacctQueryFilter,
    IntacctQueryFilterGroup,
    Comparison,
    Operator
} from './query';

class IntacctQueryBuilder implements QueryBuilderInterface {
    createQuery(fields: Array<string> = [], page = 1, limit = 100): IntacctQuery {
        return new IntacctQuery(fields, page, limit);
    }

    createFilter(field: string, value: any, comparison: Comparison): IntacctQueryFilter {
        return new IntacctQueryFilter(field, value, comparison);
    }

    createFilterGroup(operator?: Operator): IntacctQueryFilterGroup {
        return new IntacctQueryFilterGroup(operator);
    }
}

export { IntacctQueryBuilder };
