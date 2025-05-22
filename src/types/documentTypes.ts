import { registerEnumType } from 'type-graphql';

export enum DocumentTypes {
    SUCCESSION_PLAN = 'successionPlan',
    STOCK_TRANSFER = 'stockTransfer',
    CHARITY_FUND = 'charityFundApplication',
    DESIGNATED_FUND = 'designatedFundApplication',
    WIRE_ACH = 'wireACH'
}
registerEnumType(DocumentTypes, {
    name: 'DocumentTypes',
    description: "types are either stored on a file's metadata or is the filename in GCP"
});
