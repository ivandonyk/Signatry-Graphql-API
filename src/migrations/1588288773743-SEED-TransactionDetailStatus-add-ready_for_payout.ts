import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDTransactionDetailStatusAddReadyForPayout1588288773743
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `INSERT INTO "transaction_detail_status" ("name", "description", "enabled")
            VALUES ('READY_FOR_PAYOUT', 'Funds are ready to transfer from Stripe to tenant bank account', true)`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'DELETE FROM "transaction_detail_status" WHERE "name" = \'READY_FOR_PAYOUT\''
        );
    }
}
