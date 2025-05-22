import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdjustInvestmentsAndHoldingsForSharedStockType1618845352842
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            ALTER TABLE investment ALTER COLUMN investment_type TYPE character varying
        `);

        const [{ id: sharedStockId }] = await queryRunner.query(/*sql */ `
            INSERT INTO investment (name, investment_type, default_allocation_percentage, description, order_num, visualization_color) VALUES (
                'Shared Stock',
                'SHARED_STOCK',
                0,
                'Shared stock account for new holdings that are acquired',
                5,
                '#E3C990'
                ) 
                RETURNING *
        `);

        await queryRunner.query(/*sql */ `
            UPDATE investment SET visualization_color = '#8C510A' WHERE investment_type = 'CONTRIBUTION_CASH' OR investment_type = 'GRANT_CASH'
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE pool_investment_holding ADD COLUMN security_id uuid
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE pool_investment_holding ADD CONSTRAINT fk_pih_security FOREIGN KEY (security_id) REFERENCES security(id) on DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(/*sql*/ `
            INSERT INTO fund_investment(fund_id, investment_id, allocation_percentage, divestment_percentage) SELECT id, '${sharedStockId}', 0, 0 FROM fund
        `);

        await queryRunner.query('DROP TYPE investment_type');

        await queryRunner.query(/*sql */ `
            ALTER TABLE gl_account_type ALTER COLUMN name TYPE character varying
        `);

        await queryRunner.query(/*sql */ `
            INSERT INTO transaction_detail_type (name, description) VALUES ('STOCK_IN', 'transaction detail type to keep track of stock contributions')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            CREATE TYPE investment_type AS ENUM (
                'IMA',
                'POOL',
                'GRANT_CASH',
                'CONTRIBUTION_CASH'
            )
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE pool_investment_holding DROP CONSTRAINT fk_pih_security
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE pool_investment_holding DROP COLUMN security_id 
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE investment ALTER COLUMN investment_type TYPE investment_type
        `);

        const [{ id: sharedStockId }] = await queryRunner.query(/*sql */ `
            SELECT id from investment where name = 'Shared Stock',
        `);

        await queryRunner.query(/*sql */ `
            DELETE FROM fund_investment WHERE investment_id = '${sharedStockId}'
        `);

        await queryRunner.query(/*sql */ `
            DELETE FROM investment WHERE investment_type = 'SHARED_STOCK'
        `);
    }
}
