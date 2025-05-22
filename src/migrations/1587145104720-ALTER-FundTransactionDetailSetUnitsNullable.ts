import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionDetailSetUnitsNullable1587145104720 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE fund_transaction_detail ALTER COLUMN units DROP NOT NULL'
        );
        await queryRunner.query(
            'ALTER TABLE ONLY fund_transaction_detail ALTER COLUMN units SET DEFAULT NULL'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE fund_transaction_detail ALTER COLUMN units SET DEFAULT 0'
        );
        await queryRunner.query('UPDATE fund_transaction_detail SET units = 0 WHERE units IS NULL');
        await queryRunner.query(
            'ALTER TABLE fund_transaction_detail ALTER COLUMN units SET NOT NULL'
        );
    }
}
