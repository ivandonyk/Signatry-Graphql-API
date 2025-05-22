import { InputType, Field, ObjectType, Float } from 'type-graphql';
import { FindOperator, Raw } from 'typeorm';
import ComparisonFilter from './ComparisonFilter';

@InputType()
export class NumberFilter extends ComparisonFilter(Number, type => Float) {}
