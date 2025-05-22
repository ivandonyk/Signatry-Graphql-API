import { InputType, Field, createUnionType, registerEnumType } from 'type-graphql';
import { TransactionStatusValue } from '../../models/TransactionStatus';
import { TransactionDetailStatusValue } from '../../models/TransactionDetailStatus';
import { RecipientStatusName } from '../../models/RecipientStatus';

export enum GrantOperations {
    UPDATE_STATUS = 'UPDATE_STATUS',
    UPDATE_GRANT_PAYMENT_STATUS = 'UPDATE_GRANT_PAYMENT_STATUS',
    TOGGLE_ON_HOLD = 'TOGGLE_ON_HOLD',
    UPDATE_CHARITY_STATUS = 'UPDATE_CHARITY_STATUS',
    TOGGLE_PURPOSE_NOTES_APPROVED = 'TOGGLE_PURPOSE_NOTES_APPROVED',
    TOGGLE_SPECIAL_INSTRUCTIONS_APPROVED = 'TOGGLE_SPECIAL_INSTRUCTIONS_APPROVED',
    TOGGLE_AVAILABLE_BALANCE_APPROVED = 'TOGGLE_AVAILABLE_BALANCE_APPROVED',
    TOGGLE_FINAL_REVIEW_APPROVED = 'TOGGLE_FINAL_REVIEW_APPROVED',
    TOGGLE_SPECIAL_APPROVAL_GIVEN = 'TOGGLE_SPECIAL_APPROVAL_GIVEN',
    TOGGLE_APPROVE_WITHOUT_DIVESTMENTS = 'TOGGLE_APPROVE_WITHOUT_DIVESTMENTS'
}

export interface GrantUpdateInputVariables {
    operation: GrantOperations;
    grantIds: string[];

    expectedCurrentBooleanValue?: boolean;
    newBooleanValue?: boolean;

    expectedCurrentGrantPaymentStatusValue?: TransactionDetailStatusValue; // used to prevent the grant from moving inadvertently to the wrong grant payment status -- if it doesn't match the current DB status, refuse to perform the action
    newGrantPaymentStatusValue?: TransactionDetailStatusValue; // the desired grant payment status value

    expectedCurrentStatusValue?: TransactionStatusValue; // used to prevent the grant from moving inadvertently to the wrong status -- if it doesn't match the current DB status, refuse to perform the action
    newStatusValue?: TransactionStatusValue; // the desired status value

    expectedCurrentRecipientStatusValue?: RecipientStatusName; // used to prevent the recipient from moving inadvertently to the wrong status -- if it doesn't match the current DB status, refuse to perform the action
    newRecipientStatusValue?: RecipientStatusName; // the desired status value
}

registerEnumType(GrantOperations, {
    name: 'GrantOperations',
    description: `
      An enum defining which Grant Management operation options are performable, the
      value of which is used to map the incoming request to the correct operation.
    `
});

registerEnumType(TransactionStatusValue, {
    name: 'TransactionStatusValues',
    description: `
    An enum defining which TransactionStatus is to be applied to the fundTransaction
    record.
    `
});

registerEnumType(TransactionDetailStatusValue, {
    name: 'TransactionDetailStatusValue',
    description: `
    An enum defining which TransactionDetailStatusValue is to be applied to the fundTransaction's cash detail record.
    `
});

registerEnumType(RecipientStatusName, {
    name: 'RecipientStatusValue',
    description: `
    An enum defining the allowed RecipientStatus values to be applied to the recipient.
    `
});

@InputType()
export class GrantUpdateInput implements GrantUpdateInputVariables {
    expectedCurrentCharityStatusValue: RecipientStatusName;
    newCharityStatusValue: RecipientStatusName;
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
            The desired status upon success of the UPDATE_CHARITY_STATUS operation.
            Nullable, but will fail if the desired operation is UPDATE_CHARITY_STATUS.
        `
    })
    newRecipientStatusValue?: RecipientStatusName;

    @Field(type => RecipientStatusName, {
        nullable: true,
        description: `
            Used when updating the RecipientStatus of a Recipient. If this value doesn't
            match the database's current value, the operation will be rejected.

            Nullable, but will fail if the desired operation is UPDATE_CHARITY_STATUS.
        `
    })
    expectedCurrentRecipientStatusValue?: RecipientStatusName;
}
