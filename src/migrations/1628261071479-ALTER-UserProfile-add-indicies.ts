import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUserProfileAddIndicies1628261071479 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE UNIQUE INDEX IDX_UserProfile_AppUserId ON user_profile (app_user_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_UserProfileAccount_UserProfileId ON user_profile_account (user_profile_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_UserProfilePhone_UserProfileId ON user_profile_phone (user_profile_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_UserProfileEmail_UserProfileId ON user_profile_email (user_profile_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_UserProfileAddress_UserProfileId ON user_profile_address (user_profile_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_UserProfileNotification_FundId ON user_profile_notification (fund_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_UserProfileNotification_NotificationId ON user_profile_notification (notification_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_UserProfileNotification_UserProfileId ON user_profile_notification (user_profile_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransaction_UserProfileId ON fund_transaction (user_profile_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FundTransaction_CreatedByAdminId ON fund_transaction (created_by_admin_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_TenantAccount_CreatedBy ON tenant_account (created_by)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_TenantAccount_UpdatedBy ON tenant_account (updated_by)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_Investment_CreatedBy ON investment (created_by)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_Investment_UpdatedBy ON investment (updated_by)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_InvestmentUnitPriceHistory_CreatedBy ON investment_unit_price_history (created_by)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_InvestmentUnitPriceHistory_UpdatedBy ON investment_unit_price_history (updated_by)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_TransactionEvent_UserProfileId ON transaction_event (user_profile_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_TransactionEvent_CreatedBy ON transaction_event (created_by)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_TransactionEvent_UpdatedBy ON transaction_event (updated_by)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_RecipientEvent_UserProfileId ON recipient_event (user_profile_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_UserProfileRole_CreatedBy ON user_profile_role (created_by)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_UserProfileRole_UpdatedBy ON user_profile_role (updated_by)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_UserProfileRole_UserProfileId ON user_profile_role (user_profile_id)'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_FinancialAdvisor_UserProfileId ON financial_advisor (user_profile_id)'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX IDX_FinancialAdvisor_UserProfileId;');
        await queryRunner.query('DROP INDEX IDX_UserProfileRole_UserProfileId;');
        await queryRunner.query('DROP INDEX IDX_UserProfileRole_UpdatedBy;');
        await queryRunner.query('DROP INDEX IDX_UserProfileRole_CreatedBy;');
        await queryRunner.query('DROP INDEX IDX_RecipientEvent_UserProfileId;');
        await queryRunner.query('DROP INDEX IDX_TransactionEvent_UpdatedBy;');
        await queryRunner.query('DROP INDEX IDX_TransactionEvent_CreatedBy;');
        await queryRunner.query('DROP INDEX IDX_TransactionEvent_UserProfileId;');
        await queryRunner.query('DROP INDEX IDX_InvestmentUnitPriceHistory_UpdatedBy;');
        await queryRunner.query('DROP INDEX IDX_InvestmentUnitPriceHistory_CreatedBy;');
        await queryRunner.query('DROP INDEX IDX_Investment_UpdatedBy;');
        await queryRunner.query('DROP INDEX IDX_Investment_CreatedBy;');
        await queryRunner.query('DROP INDEX IDX_TenantAccount_UpdatedBy;');
        await queryRunner.query('DROP INDEX IDX_TenantAccount_CreatedBy;');
        await queryRunner.query('DROP INDEX IDX_FundTransaction_CreatedByAdminId;');
        await queryRunner.query('DROP INDEX IDX_FundTransaction_UserProfileId;');
        await queryRunner.query('DROP INDEX IDX_UserProfileNotification_UserProfileId;');
        await queryRunner.query('DROP INDEX IDX_UserProfileNotification_NotificationId;');
        await queryRunner.query('DROP INDEX IDX_UserProfileNotification_FundId;');
        await queryRunner.query('DROP INDEX IDX_UserProfileAddress_UserProfileId;');
        await queryRunner.query('DROP INDEX IDX_UserProfileEmail_UserProfileId;');
        await queryRunner.query('DROP INDEX IDX_UserProfilePhone_UserProfileId;');
        await queryRunner.query('DROP INDEX IDX_UserProfileAccount_UserProfileId;');
        await queryRunner.query('DROP INDEX IDX_UserProfile_AppUserId;');
    }
}
