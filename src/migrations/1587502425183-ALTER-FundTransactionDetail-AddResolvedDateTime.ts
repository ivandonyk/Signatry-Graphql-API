import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionDetailAddResolvedDateTime1587502425183
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        // add resolved_date_time column to fund_transaction_detail
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction_detail ADD COLUMN resolved_date_time TIMESTAMP null
        `);
        // seed existing rows
        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction_detail SET resolved_date_time = transaction_date_time
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction_detail DROP COLUMN resolved_date_time
        `);
    }
}
