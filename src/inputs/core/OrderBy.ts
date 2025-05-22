import { registerEnumType } from 'type-graphql';

export enum OrderBy {
    Ascending = 'ASC',
    Descending = 'DESC'
}

registerEnumType(OrderBy, { name: 'OrderBy' });
