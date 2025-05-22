import { EntityManager, EntityRepository, Repository } from 'typeorm';
import dayjs from 'dayjs';

// models
import { FundTransaction, RecipientPreferredPayment, Tenant, GLAccount } from '../models';
import { ACHManualMeta } from '../models/FundTransactionMetadata';
import { GLAccountTypeName } from '../models/GLAccountType';
// repositories
import { GLAccountRepository } from './GLAccount';
// utilities
import { formatCurrency } from '../utilities/format';

@EntityRepository(FundTransaction)
export class GrantManagementRepository extends Repository<FundTransaction> {
    /**
     * @see /src/models/FundTransactionMetadata.ts ACHManualMeta
     */
    async generateACHMetadata(
        manager: EntityManager,
        tenant: Tenant,
        grant: FundTransaction,
        recipientId: string,
        grantDispersementGLAccount?: GLAccount
    ): Promise<ACHManualMeta> {
        const preferredPayments = await manager
            .getRepository(RecipientPreferredPayment)
            .findOne({ recipientId });

        const glAccount =
            grantDispersementGLAccount ||
            (await manager
                .getCustomRepository(GLAccountRepository)
                .getByType(GLAccountTypeName.GRANT_DISBURSEMENT));

        return {
            /**
             * @note destination = recipient
             * @note origin = tenant
             * */
            immediateDestination: preferredPayments.metadata.achMetadata.routingNumber,
            immediateDestinationName: preferredPayments.metadata.achMetadata.bankName,
            /** @note both `immediateOrigin` and `companyIdentification` are tenant's EIN */
            immediateOrigin: tenant.appSetting.ein,
            companyIdentification: tenant.appSetting.ein,
            immediateOriginName: tenant.appSetting.tenantLegalName || tenant.name,
            companyName: tenant.appSetting.tenantName,
            /**
             * @description Optional field to describe input file for internal accounting purposes
             * @note batch id
             * @todo I'm not seeing batch ids
             */
            referenceCode: 'A000001',
            /**
             * @description possible values:
             * 200 - ACH Entries Mixed Debits and Credits
             * 220 - ACH Credits Only
             * 225 - ACH Debits Only
             * @note hard code "225" for Debits only
             * this means we are only using this file to SEND money, not to receive money */
            serviceClassCode: '225',
            /**
             * @description possible values:
             * PPD (Prearranged Payments and Deposit entries) for consumer items
             * CCD (Cash Concentration and Disbursement entries)
             * CTX (Corporate Trade Exchange entries) for corporate transactions
             * TEL (Telephone initiated entries)
             * WEB (Authorization received via the Internet)
             * @note client's recommend `CCD` or `PPD` */
            standardEntryClassCode: 'PPD',
            /** @description description of transaction */
            companyEntryDescription: grant.transactionCode,
            /**
             * @note both `companyDescriptiveDate` and `effectiveEntryDate`
             * are the date payment file was generated (i.e. today) */
            companyDescriptiveDate: dayjs().toISOString(),
            effectiveEntryDate: dayjs().toISOString(),
            /** @note DFI are routing and account numbers */
            originatingDFI: glAccount.institutionAccount.routingNumber,
            receivingDFI: preferredPayments.metadata.achMetadata.routingNumber,
            DFIAccount: preferredPayments.metadata.achMetadata.accountNumber,
            amount: `${formatCurrency(Math.abs(grant.amount))}`,
            /**
             * @description Name of receiver
             * @note recipient's ID
             * */
            idNumber: grant.transactionInfo.recipient.recipientCode,
            individualName: preferredPayments.metadata.achMetadata.beneficiaryName,
            /**
             * @description possible values
             * 22 - Deposit destined for a Checking Account
             * 23 - Prenotification for a checking credit
             * 24 - Zero dollar with remittance into Checking Account
             * 27 - Debit destined for a Checking Account
             * 28 - Prenotification for a checking debit
             * 29 - Zero dollar with remittance into Checking Account
             * 32 - Deposit destined for a Savings Account
             * 33 - Prenotification for a savings credit
             * 34 - Zero dollar with remittance into Savings Account
             * 37 - Debit destined for a Savings Account
             * 38 - Prenotification for a Savings debit
             * 39 - Zero dollar with remittance into Savings Account
             * @note leave hard coded to 22 */
            transactionCode: '22'
        };
    }
}
