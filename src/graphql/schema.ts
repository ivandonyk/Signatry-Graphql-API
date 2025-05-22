import { buildSchema } from 'type-graphql';
import { GraphQLSchema } from 'graphql';
import * as resolvers from '../resolvers';
import { ProfileResolver } from './userProfile.resolver';
import { UserProfileAccountResolver } from './userProfileAccount.resolver';
import { TenantResolver } from './tenant.resolver';
import { TenantAccountResolver } from './tenantAccount.resolver';
import { FundResolver } from './fund.resolver';
import { FundTypeResolver } from './fundType.resolver';
import { SendgridResolver } from './sendgrid.resolver';
import { InvestmentsResolver } from './investments.resolver';
import { FundInvestmentResolver } from './fundInvestment.resolver';
import { FundTransactionCommentResolver } from './fundTransactionComments.resolver';
import { UnitPriceHistoryResolver } from './unitPriceHistory.resolver';
import { InvestmentInstructionsResolver } from './investmentInstructions.resolver';
import { PayoutResolver } from './payout.resolver';
import { RolesResolver } from './roles.resolver';
import { PeopleResolver } from './people.resolver';
import { FundTransactionResolver } from './fundTransaction.resolver';
import { FundRebalanceResolver } from './fundRebalance.resolver';
import { RecipientResolver } from './recipient.resolver';
import { RecipientCommentsResolver } from './recipientComments.resolver';
import { RecipientEventResolver } from './recipientEvent.resolver';
import { FundHoldingsResolver } from './fundHoldings.resolver';
import { FundTransactionInfoResolver } from './transactionInfo.resolver';
import { GrantManagementResolver } from './grantManagement.resolver';
import { CreditCardResolver } from './creditCard.resolver';
import { UIFundingSourceResolver } from './uiFundingSource.resolver';
import { UITenantAccountResolver } from './uiTenantAccount.resolver';
import { FutureFundTransactionResolver } from './futureFundTransaction.resolver';
import { TransactionEventResolver } from './transactionEvent.resolver';
import { TransactionProcessedEventResolver } from './transactionProcessedEvent.resolver';
import { TransactionRecurrenceResolver } from './transactionRecurrence.resolver';
import { CauseResolver } from './cause.resolver';
import { RecipientFinancialsResolver } from './recipientFinancials.resolver';
import { InstitutionAccountResolver } from './institutionAccount.resolver';
import { FundRolesResolver } from './fundRoles.resolver';
import { FundRelationshipResolver } from './fundRelationship.resolver';
import { PerformanceResolver } from './performance.resolver';
import { ReconciliationResolver } from './reconciliation.resolver';
import { ReconciliationHistoryResolver } from './reconciliationHistory.resolver';
import { ReconciliationCommentResolver } from './reconciliationComment.resolver';
import { BatchResolver } from './batch.resolver';
import { BatchCommentResolver } from './batchComment.resolver';
import { InstitutionAccountTransactionResolver } from './institutionAccountTransaction.resolver';
import { NotificationResolver } from './notification.resolver';
import { HoldingResolver } from './holding.resolver';
import { PositionTypeResolver } from './positionType.resolver';
import { DocumentResolver } from './document.resolver';
import { FeeResolver } from './fee.resolver';
import { AllTransactionResolver } from './allTransaction.resolver';
import { FundGrantManagementResolver } from './fundGrantManagerment.resolver';
import { MoneyMovementResolver } from './moneyMovement.resolver';
import { SegmentResolver } from './segment.resolver';
import { FundTransactionDetailResolver } from './fundTransactionDetail.resolver';
import { FinancialAdvisorResolver } from './FinancialAdvisor.resolver';
import { LoggingResolver } from './logging.resolver';
import { UserResetResolver } from './userReset.resolver';

export function createSchema(): Promise<GraphQLSchema> {
    return buildSchema({
        resolvers: [
            ...Object.values(resolvers),
            ProfileResolver,
            UserProfileAccountResolver,
            TenantResolver,
            TenantAccountResolver,
            FundResolver,
            FundTypeResolver,
            SendgridResolver,
            InvestmentsResolver,
            FundInvestmentResolver,
            UnitPriceHistoryResolver,
            InvestmentInstructionsResolver,
            PayoutResolver,
            RolesResolver,
            PeopleResolver,
            FundTransactionResolver,
            FundRebalanceResolver,
            RecipientResolver,
            FundHoldingsResolver,
            FundTransactionCommentResolver,
            GrantManagementResolver,
            CreditCardResolver,
            UIFundingSourceResolver,
            UITenantAccountResolver,
            FundTransactionInfoResolver,
            GrantManagementResolver,
            FutureFundTransactionResolver,
            TransactionEventResolver,
            TransactionProcessedEventResolver,
            TransactionRecurrenceResolver,
            CauseResolver,
            RecipientFinancialsResolver,
            RecipientCommentsResolver,
            RecipientEventResolver,
            ReconciliationResolver,
            ReconciliationCommentResolver,
            ReconciliationHistoryResolver,
            InstitutionAccountResolver,
            InstitutionAccountTransactionResolver,
            FundRolesResolver,
            FundRelationshipResolver,
            PerformanceResolver,
            BatchResolver,
            BatchCommentResolver,
            HoldingResolver,
            NotificationResolver,
            PositionTypeResolver,
            DocumentResolver,
            FeeResolver,
            AllTransactionResolver,
            FundGrantManagementResolver,
            MoneyMovementResolver,
            SegmentResolver,
            FundTransactionDetailResolver,
            FinancialAdvisorResolver,
            LoggingResolver,
            UserResetResolver
        ]
    });
}
