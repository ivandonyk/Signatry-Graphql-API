import { InputType, Field, registerEnumType } from 'type-graphql';
import { TransactionStatusValue } from '../../models/TransactionStatus';

export interface GrantCancelInputVariables {
    fundId: string;
    grantId: string;
    expectedCurrentStatusValue?: TransactionStatusValue; // used to prevent the grant from moving inadvertently to the wrong status -- if it doesn't match the current DB status, refuse to perform the action
    newStatusValue?: TransactionStatusValue; // the desired status value
}

registerEnumType(TransactionStatusValue, {
    name: 'TransactionStatusValues',
    description: `
    An enum defining which TransactionStatus is to be applied to the fundTransaction
    record.
    `
});
@InputType()
export class GrantCancelInput implements GrantCancelInputVariables {
    @Field(type => String, {
        nullable: false,
        description: `
        FundId needed for permission check
    `
    })
    fundId: string;

    @Field(type => String, {
        nullable: false,
        description: `
        The target Grant
    `
    })
    grantId: string;

    @Field(type => TransactionStatusValue, {
        nullable: true,
        description: `
            Used when updating the TransactionStatus of a Grant. If this value doesn't
            match the database's current value, the operation will be rejected.

            Nullable, but will fail if the desired operation is UPDATE_STATUS.
        `
    })
    expectedCurrentStatusValue?: TransactionStatusValue;

    @Field(type => TransactionStatusValue, {
        nullable: true,
        description: `
            The desired status upon success of the UPDATE_STATUS operation.
            Nullable, but will fail if the desired operation is UPDATE_STATUS.
        `
    })
    newStatusValue?: TransactionStatusValue;
}
