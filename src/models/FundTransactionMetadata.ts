import { FundTransactionSourceStatusValue } from './FundTransactionSource';
import { FundInvestment } from './FundInvestment';
import { ObjectType, Field } from 'type-graphql';
import { FundTransactionDetail } from '.';
import { DetailPaymentType } from './FundTransactionDetail';

export enum PaymentTypes {
    ACH = 'ACH',
    CASH = 'Cash',
    CHECK = 'Check',
    CREDIT = 'Credit',
    SECURITY = 'Security',
    WIRE = 'Wire'
}
@ObjectType()
export class FundDetailsMetadata {
    @Field(type => String, { nullable: true })
    fundId?: string;
    @Field(type => String, { nullable: true })
    fundName?: string;
    @Field(type => String, { nullable: true })
    fundCode?: string;
}

@ObjectType()
export class FundTransferSourceMeta {
    @Field(type => String, { nullable: false })
    id: string;
    @Field(type => FundDetailsMetadata, { nullable: true })
    fundDetails?: FundDetailsMetadata;
}

@ObjectType()
export class FundTransactionSourceMeta {
    @Field(type => String, { nullable: false })
    id: string;
    @Field(type => Boolean, { nullable: true })
    isManual?: boolean;
    @Field(type => String, { nullable: true })
    status?: FundTransactionSourceStatusValue;
    @Field(type => String, { nullable: true })
    userProfileAccountId?: string;
    @Field(type => String, { nullable: true })
    customerId?: string;
    @Field(type => String, { nullable: true })
    chargeId?: string;
}
@ObjectType()
export class FundTransactionDestinationMeta {
    @Field(type => String, { nullable: false })
    id: string;
    @Field(type => String, { nullable: true })
    fundTransactionId?: string;
    @Field(type => String, { nullable: true })
    recipientId?: string;
    @Field(type => String, { nullable: true })
    purposeNotes?: string;
    @Field(type => String, { nullable: true })
    purposeCategory?: string;
    @Field(type => Boolean, { nullable: true })
    purposeNotesApproved?: boolean;
    @Field(type => String, { nullable: true })
    specialInstructions?: string;
    @Field(type => String, { nullable: true })
    specialRecognition?: string;
    @Field(type => Boolean, { nullable: true })
    includeFundNameInRecognition?: boolean;
    @Field(type => Boolean, { nullable: true })
    includeDonorNameInRecognition?: boolean;
    @Field(type => Boolean, { nullable: true })
    includeDonorAddressInRecognition?: boolean;
    @Field(type => Boolean, { nullable: true })
    specialInstructionsApproved?: boolean;
    // is this actually used anywhere?
    @Field(type => Date, { nullable: true })
    requestedProcessDate?: Date;
}
@ObjectType()
export class FundTransferDestinationMeta {
    @Field(type => String, { nullable: true })
    id: string;
    @Field(type => FundDetailsMetadata, { nullable: true })
    fundDetails?: FundDetailsMetadata;
    @Field(type => String, { nullable: true })
    fundTransactionId?: string;
}

@ObjectType()
export class TransactionPaymentTypeDetails {
    @Field(type => String, { nullable: false })
    paymentType: DetailPaymentType;
    @Field(type => String, { nullable: true })
    paymentNumber?: string;
    @Field(type => String, { nullable: true })
    securityId?: string;
    @Field(type => String, { nullable: true })
    securityName?: string;
    @Field(type => String, { nullable: true })
    tickerSymbol?: string;
    @Field(type => String, { nullable: true })
    units?: string;
    @Field(type => String, { nullable: true })
    value?: string;
    @Field(type => String, { nullable: true })
    fees?: string;
    @Field(type => String, { nullable: true })
    cusip?: string;
}

@ObjectType()
export class RequestedRecipientInfo {
    @Field(type => String, { nullable: true })
    recipientName?: string;
    @Field(type => String, { nullable: true })
    recipientNotes?: string;
}

@ObjectType()
export class TransactionPaymentMeta {
    @Field(type => Number, { nullable: true })
    checkNumber: number;
    @Field(type => Number, { nullable: true })
    fileNumber?: number;
    @Field(type => String, { nullable: true })
    date: string;
    @Field(type => String, { nullable: true })
    payee: string;
    @Field(type => String, { nullable: true })
    address: string;
    @Field(type => String, { nullable: true })
    city: string;
    @Field(type => String, { nullable: true })
    state: string;
    @Field(type => String, { nullable: true })
    zip: string;
    @Field(type => Number, { nullable: true })
    amount: number;
    @Field(type => String, { nullable: true })
    grantDetails: string;
    @Field(type => String, { nullable: true })
    memo: string;
    @Field(type => String, { nullable: true })
    dedication: string;
    @Field(type => String, { nullable: true })
    paymentFileId: string;
    @Field(type => String, { nullable: true })
    beneficiaryName?: string;
    @Field(type => String, { nullable: true })
    beneficiaryRoutingNumber?: string;
    @Field(type => String, { nullable: true })
    beneficiaryBankName?: string;
    @Field(type => String, { nullable: true })
    paymentMemo?: string;
}

/**
 * Resources:
 * @see https://docs.google.com/spreadsheets/d/16-QqPooHz7oFF6a0LopHn6EU-ZcHNeFkfwGngy7n1Jo/edit?usp=sharing
 * @see https://secureinstantpayments.com/sip/help/interface_specs/external/NACHA_format.pdf
 * */
@ObjectType()
export class ACHManualMeta {
    @Field(type => String, { nullable: true })
    immediateDestination: string;
    @Field(type => String, { nullable: true })
    immediateOrigin: string;
    @Field(type => String, { nullable: true })
    immediateDestinationName: string;
    @Field(type => String, { nullable: true })
    immediateOriginName: string;
    @Field(type => String, { nullable: true })
    referenceCode: string;
    @Field(type => String, { nullable: true })
    serviceClassCode: string;
    @Field(type => String, { nullable: true })
    companyName: string;
    @Field(type => String, { nullable: true })
    standardEntryClassCode: string;
    @Field(type => String, { nullable: true })
    companyIdentification: string;
    @Field(type => String, { nullable: true })
    companyEntryDescription: string;
    @Field(type => String, { nullable: true })
    companyDescriptiveDate: string;
    @Field(type => String, { nullable: true })
    effectiveEntryDate: string;
    @Field(type => String, { nullable: true })
    originatingDFI: string;
    @Field(type => String, { nullable: true })
    receivingDFI: string;
    @Field(type => String, { nullable: true })
    DFIAccount: string;
    @Field(type => String, { nullable: true })
    amount: string;
    @Field(type => String, { nullable: true })
    idNumber: string;
    @Field(type => String, { nullable: true })
    individualName: string;
    @Field(type => String, { nullable: true })
    discretionaryData?: string;
    @Field(type => String, { nullable: true })
    transactionCode: string;
}

@ObjectType()
export class ProposedDetailsMeta {
    @Field(type => Number, { nullable: true })
    amount: number;
    @Field(type => String, { nullable: true })
    sourceAccountId: string;
    @Field(type => String, { nullable: true })
    destinationAccountId: string;
    @Field(type => String, { nullable: true })
    transactionDetailStatusId: string;
    @Field(type => String, { nullable: true })
    transactionDetailTypeId: string;
    @Field(type => String, { nullable: true })
    createdBy?: string;
    @Field(type => String, { nullable: true })
    updatedBy?: string;
    @Field(type => String, { nullable: true })
    fundInvestmentId: string;
    @Field(type => String, { nullable: true })
    fundInvestmentName: string;
    @Field(type => FundInvestment, { nullable: true })
    fundInvestment?: FundInvestment;
    @Field(type => Number, { nullable: true })
    percentage: number;
    @Field(type => Date, { nullable: true })
    resolvedDateTime?: Date;
    @Field(type => Date, { nullable: true })
    transactionDateTime?: Date;
    @Field(type => String)
    investmentId: string;
}

@ObjectType()
export class ExternalInfo {
    @Field(type => String, { nullable: true })
    paymentTransactionId: string; // iDonate field
}

@ObjectType()
export class TransactionMetadata {
    @Field(type => FundTransactionDestinationMeta, { nullable: true })
    transactionDestination?: FundTransactionDestinationMeta;

    @Field(type => FundTransactionSourceMeta, { nullable: true })
    transactionSource?: FundTransactionSourceMeta;

    @Field(type => TransactionPaymentMeta, { nullable: true })
    transactionPayment?: TransactionPaymentMeta;

    @Field(type => ACHManualMeta, { nullable: true })
    achPayment?: ACHManualMeta;

    @Field(type => [ProposedDetailsMeta], { nullable: true })
    proposedDetails?: ProposedDetailsMeta[];

    @Field(type => String, { nullable: true })
    description?: string;

    @Field(type => TransactionPaymentTypeDetails, { nullable: true })
    paymentDetails?: TransactionPaymentTypeDetails;

    @Field(type => RequestedRecipientInfo, { nullable: true })
    recipientInfo?: RequestedRecipientInfo;

    @Field(type => String, { nullable: true })
    migratedTransactionId?: string; // Stores RENPSG transaction ID from migration

    @Field(type => String, { nullable: true })
    migratedTransactionSeriesId?: string; // Stores RENPSG series ID from migration

    @Field(type => ExternalInfo, { nullable: true })
    externalInfo?: ExternalInfo;
}

@ObjectType()
export class TransferMetadata {
    @Field(type => FundTransferDestinationMeta, { nullable: true })
    transactionDestination?: FundTransferDestinationMeta;

    @Field(type => FundTransferSourceMeta, { nullable: true })
    transactionSource?: FundTransferSourceMeta;

    @Field(type => TransactionPaymentMeta, { nullable: true })
    transactionPayment?: TransactionPaymentMeta;

    @Field(type => String, { nullable: true })
    transferId?: string;

    @Field(type => ACHManualMeta, { nullable: true })
    achPayment?: ACHManualMeta;

    @Field(type => [ProposedDetailsMeta], { nullable: true })
    proposedDetails?: ProposedDetailsMeta[];

    @Field(type => String, { nullable: true })
    description?: string;

    @Field(type => TransactionPaymentTypeDetails, { nullable: true })
    paymentDetails?: TransactionPaymentTypeDetails;

    @Field(type => RequestedRecipientInfo, { nullable: true })
    recipientInfo?: RequestedRecipientInfo;

    @Field(type => String, { nullable: true })
    migratedTransactionId?: string; // Stores RENPSG transaction ID from migration

    @Field(type => String, { nullable: true })
    migratedTransactionSeriesId?: string; // Stores RENPSG series ID from migration

    @Field(type => ExternalInfo, { nullable: true })
    externalInfo?: ExternalInfo;
}

@ObjectType()
export class RebalanceMetadata {
    @Field(type => [ProposedDetailsMeta], { nullable: true })
    proposedDetails?: ProposedDetailsMeta[];
}

// @ObjectType()
// export class FundTransactionMetadata {
//     @Field(type => FundTransactionDestinationMeta || FundTransferDestinationMeta, {
//         nullable: true
//     })
//     transactionDestination: FundTransactionDestinationMeta | FundTransferDestinationMeta;

//     @Field(type => FundTransactionSourceMeta || FundTransferSourceMeta, { nullable: true })
//     transactionSource: FundTransactionSourceMeta | FundTransferSourceMeta;

//     @Field(type => String, { nullable: true })
//     transferId?: string;
// }
