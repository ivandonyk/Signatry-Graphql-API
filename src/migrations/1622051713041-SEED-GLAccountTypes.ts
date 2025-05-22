import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDGLAccountTypes1622051713041 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        INSERT INTO "gl_account_type" ("name", "label", "description") 
        VALUES 
            ('SHARED_STOCK_HOLD', 'Shared Stock Hold', 'Shared stock hold'),
            ('SHARED_STOCK_VANGUARD', 'Shared Stock Vanguard', 'Shared stock Vanguard'),
            ('INTEREST_INCOME', 'Interest Income', 'Interest income'),
            ('DIVIDEND_INCOME', 'Dividend Income', 'Dividend income'),
            ('UNREALIZED_GAIN_LOSS', 'Unrealized Gains and Losses', 'Unrealized gains and losses'),
            ('REALIZED_GAIN_LOSS', 'Realized Gains and Losses', 'Realized gains and losses'),
            ('UNITIZED_GAIN_LOSS', 'Unitized Gains and Losses', 'Unitized gains and losses for pools'),
            ('ADVISOR_FEES', 'Advisor Fees', 'Advisor fees for managed brokerage accounts'),
            ('BANK_FEES', 'Bank Fees', 'Bank fees')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
