import { InputType, Field } from 'type-graphql';
import ComparisonFilter from './ComparisonFilter';

@InputType()
export class DateFilter extends ComparisonFilter(Date, type => Date) {}
