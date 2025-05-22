import { ObjectType, Field } from 'type-graphql';
import {
    GrantOperations,
    GrantUpdateInputVariables
} from '../inputs/FundTransaction/GrantUpdateInput';
import { TransactionStatusValue } from './TransactionStatus';
import { TransactionDetailStatusValue } from './TransactionDetailStatus';
import { RecipientStatusName } from './RecipientStatus';

@ObjectType()
export class GrantUpdateResponse implements GrantUpdateInputVariables {
    @Field(type => GrantOperations, {
        nullable: false,
        description: `
            One of the possible operations that this mutation can be used for (see GrantOperations interface)
        `
    })
    operation: GrantOperations;

    @Field(type => [String], {
        nullable: false,
        description: `
        The list of target Grants
    `
    })
    grantIds: string[];

    @Field(type => Boolean, {
        nullable: true,
        description: `
            Used when toggling a value that constitutes one of the boolean "steps" required 
            in order to move a Grant to the next status, or an on hold value. If this value
            doesn't match the database's current value, the operation will be rejected.

            Nullable, but will fail if the desired operation toggles a boolean value.
        `
    })
    expectedCurrentBooleanValue?: boolean;

    @Field(type => Boolean, { nullable: true })
    systemActionsTaken?: boolean;

    @Field(type => Boolean, {
        nullable: true,
        description: `
            The desired state for the "step" upon success of the operation, constituting
            one of the many "steps" required before a Grant is moved to the next status.

            Nullable, but will fail if the desired operation toggles a boolean value.
        `
    })
    newBooleanValue?: boolean;

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

    @Field(type => TransactionDetailStatusValue, {
        nullable: true,
        description: `
            Used when updating the GrantPaymentStatus of a Grant. If this value doesn't
            match the database's current value, the operation will be rejected.

            Nullable, but will fail if the desired operation is UPDATE_GRANT_PAYMENT_STATUS.
        `
    })
    expectedCurrentGrantPaymentStatusValue?: TransactionDetailStatusValue;

    @Field(type => TransactionDetailStatusValue, {
        nullable: true,
        description: `
            The desired status upon success of the UPDATE_GRANT_PAYMENT_STATUS operation.
            Nullable, but will fail if the desired operation is UPDATE_GRANT_PAYMENT_STATUS.
        `
    })
    newGrantPaymentStatusValue?: TransactionDetailStatusValue;

    @Field(type => RecipientStatusName, {
        nullable: true,
        description: `
            Used when updating the RecipientStatus of a Grant. If this value doesn't
            match the database's current value, the operation will be rejected.

            Nullable, but will fail if the desired operation is UPDATE_CHARITY_STATUS.
        `
    })
    expectedCurrentRecipientStatusValue?: RecipientStatusName;

    @Field(type => RecipientStatusName, {
        nullable: true,
        description: `
            The desired status upon success of the UPDATE_CHARITY_STATUS operation.
            Nullable, but will fail if the desired operation is UPDATE_CHARITY_STATUS.
        `
    })
    newRecipientStatusValue?: RecipientStatusName;
}
