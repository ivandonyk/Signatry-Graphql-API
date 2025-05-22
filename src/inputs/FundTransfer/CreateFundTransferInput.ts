import { TransferType } from '../../utilities/transfers';
import { InputType, Field, Float } from 'type-graphql';
import { OneTimeGrantInput } from '../Grant/OneTimeGrantInput';
import { RecurringGrantInput } from '../Grant/RecurringGrantInput';

@InputType()
export class CreateFundTransferInput {
    @Field(type => String, { nullable: true })
    toFundId?: string;

    @Field(type => String, { nullable: true })
    toFundName?: string;

    @Field(type => String, { nullable: true })
    toFundCode?: string;

    @Field(type => String)
    fromFundId: string;

    @Field(type => Float)
    amount: number;

    @Field(type => String, { nullable: true })
    requestDate: string;

    @Field(type => TransferType)
    type: TransferType;

    @Field(type => String, { nullable: true })
    transferId?: string;
}
