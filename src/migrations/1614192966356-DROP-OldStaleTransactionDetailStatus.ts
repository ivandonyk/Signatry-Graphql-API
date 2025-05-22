import { MigrationInterface, QueryRunner } from 'typeorm';

export class DROPOldStaleTransactionDetailStatus1614192966356 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            DROP TYPE "_transaction_detail_type_name"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        CREATE TYPE "_transaction_detail_type_name" AS ENUM (
                'GRANT_DIVESTMENT_CASH',
                'GRANT_PAYMENT_CASH',
                'CONTRIBUTION_CASH',
                'INVESTMENT',
                'DIVESTMENT',
                'FEE',
                'TRANSFER_IN',
                'TRANSFER_OUT'
            )
    `);
    }
}
