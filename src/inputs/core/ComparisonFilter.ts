import { Field, ClassType, InputType } from 'type-graphql';
import { ReturnTypeFunc } from 'type-graphql/dist/decorators/types';

export default function ComparisonFilter<TItem>(
    TItemClass: ClassType<TItem>,
    fieldType: ReturnTypeFunc
) {
    @InputType(`${TItemClass.name}ComparisonFilterClass`)
    class ComparisonFilterClass {
        @Field(fieldType, { nullable: true })
        equal?: TItem;

        @Field(fieldType, { nullable: true })
        moreThan?: TItem;

        @Field(fieldType, { nullable: true })
        moreThanOrEqual?: TItem;

        @Field(fieldType, { nullable: true })
        lessThan?: TItem;

        @Field(fieldType, { nullable: true })
        lessThanOrEqual?: TItem;

        @Field(fieldType, { nullable: true })
        is?: TItem;
    }
    return ComparisonFilterClass;
}
