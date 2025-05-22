import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDTransactionStatusAddReadyForPayout1588288766450 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `INSERT INTO "transaction_status" ("name", "description", "enabled")
            VALUES ('READY_FOR_PAYOUT', 'Funds are ready to transfer from Stripe to tenant bank account', true)`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'DELETE FROM "transaction_status" WHERE "name" = \'READY_FOR_PAYOUT\''
        );
    }
}
