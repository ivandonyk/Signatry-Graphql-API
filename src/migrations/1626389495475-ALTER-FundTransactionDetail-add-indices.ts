import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionDetailAddIndices1626389495475 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fund Transaction
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransactionDetail_FundTransaction ON fund_transaction_detail (fund_transaction_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransactionInfo_FundTransactionId ON fund_transaction_info (fund_transaction_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransactionComment_FundTransactionId ON fund_transaction_comment (fund_transaction_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransaction_FundTransactionId ON fund_transaction (original_fund_transaction_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransaction_TransactionStatusId ON fund_transaction (transaction_status_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransaction_TransactionTypeId ON fund_transaction (transaction_type_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransaction_FundId ON fund_transaction (fund_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransaction_TransactionRecurrenceId ON fund_transaction (transaction_recurrence_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_TransactionEvent_FundTransactionId ON transaction_event (fund_transaction_id)'
        );

        // Fund Investment
        await queryRunner.query(
            'CREATE INDEX IDX_FundInvestment_InvestmentId ON fund_investment (investment_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundInvestment_FundId ON fund_investment (fund_id)'
        );

        // Investment, holdings, and transaction-related tables
        await queryRunner.query(
            'CREATE INDEX IDX_PoolInvestmentHolding_FundInvestmentId ON pool_investment_holding (fund_investment_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_Holding_InstitutionAccountId ON holding (institution_account_id)'
        );
        await queryRunner.query('CREATE INDEX IDX_Holding_SecurityId ON holding (security_id)');
        await queryRunner.query(
            'CREATE INDEX IDX_InstitutionAccountTransaction_InstitutionAccountId ON institution_account_transaction (institution_account_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_Investment_InstitutionAccountId ON investment (institution_account_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_Investment_GLAccountId ON investment (gl_account_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_InstitutionAccount_GLAccountId ON institution_account (gl_account_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_InstitutionAccount_AccountId ON institution_account (account_id)'
        );

        // Fund Transaction Detail
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransactionDetail_SourceGLAccountId ON fund_transaction_detail (source_glaccount_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransactionDetail_DestinationGLAccountId ON fund_transaction_detail (destination_glaccount_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransactionDetail_TransactionDetailStatusId ON fund_transaction_detail (transaction_detail_status_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransactionDetail_TransactionDetailTypeId ON fund_transaction_detail (transaction_detail_type_id)'
        );

        // User Profile and role-related tables
        await queryRunner.query(
            'CREATE INDEX IDX_FundUserProfile_FundId ON fund_user_profile (fund_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundUserProfile_FundRoleId ON fund_user_profile (fund_role_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundUserProfile_UserProfileId ON fund_user_profile (user_profile_id)'
        );

        // Fund
        await queryRunner.query('CREATE INDEX IDX_FundContact_FundId ON fund_contact (fund_id)');
        await queryRunner.query('CREATE INDEX IDX_Fund_FundCode ON fund (fund_code)');

        // Recipient
        await queryRunner.query(
            'CREATE INDEX IDX_Recipient_RecipientStatusId ON recipient (recipient_status_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_RecipientContact_RecipientId ON recipient_contact (recipient_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_RecipientFinancials_RecipientId ON recipient_financials (recipient_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_RecipientBoardOfDirectorsMember_RecipientId ON recipient_board_of_directors_member (recipient_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_RecipientContactEmail_RecipientContactId ON recipient_contact_email (recipient_contact_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_RecipientContactPhone_RecipientContactId ON recipient_contact_phone (recipient_contact_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_RecipientContactAddress_RecipientContactId ON recipient_contact_address (recipient_contact_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_RecipientCause_RecipientId ON recipient_cause (recipient_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_RecipientCause_CauseId ON recipient_cause (cause_id)'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundTransactionDetail_FundTransaction');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundTransactionInfo_FundTransactionId');
        await queryRunner.query(
            'DROP INDEX IF EXISTS IDX_FundTransactionComment_FundTransactionId'
        );
        await queryRunner.query('DROP INDEX IF EXISTS IDX_TransactionEvent_FundTransactionId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundTransaction_FundTransactionId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundInvestment_InvestmentId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_PoolInvestmentHolding_FundInvestmentId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_Holding_InstitutionAccountId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundInvestment_FundId');
        await queryRunner.query(
            'DROP INDEX IF EXISTS IDX_InstitutionAccountTransaction_InstitutionAccountId'
        );
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundTransaction_FundId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundTransaction_TransactionRecurrenceId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_InstitutionAccount_GLAccountId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_Investment_GLAccountId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_Investment_InstitutionAccountId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundTransactionDetail_SourceGLAccountId');
        await queryRunner.query(
            'DROP INDEX IF EXISTS IDX_FundTransactionDetail_DestinationGLAccountId'
        );
        await queryRunner.query(
            'DROP INDEX IF EXISTS IDX_FundTransactionDetail_TransactionDetailStatusId'
        );
        await queryRunner.query(
            'DROP INDEX IF EXISTS IDX_FundTransactionDetail_TransactionDetailTypeId'
        );
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundTransaction_TransactionStatusId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundTransaction_TransactionTypeId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundUserProfile_FundId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundUserProfile_FundRoleId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundUserProfile_UserProfileId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_FundContact_FundId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_InstitutionAccount_AccountId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_Holding_SecurityId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_Fund_FundCode');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_Recipient_RecipientStatusId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_RecipientContact_RecipientId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_RecipientFinancials_RecipientId');
        await queryRunner.query(
            'DROP INDEX IF EXISTS IDX_RecipientBoardOfDirectorsMember_RecipientId'
        );
        await queryRunner.query(
            'DROP INDEX IF EXISTS IDX_RecipientContactEmail_RecipientContactId'
        );
        await queryRunner.query(
            'DROP INDEX IF EXISTS IDX_RecipientContactPhone_RecipientContactId'
        );
        await queryRunner.query(
            'DROP INDEX IF EXISTS IDX_RecipientContactAddress_RecipientContactId'
        );
        await queryRunner.query('DROP INDEX IF EXISTS IDX_RecipientCause_RecipientId');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_RecipientCause_CauseId');
    }
}
