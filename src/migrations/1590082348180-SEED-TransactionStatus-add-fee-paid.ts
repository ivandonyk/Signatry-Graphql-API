import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDTransactionStatusAddFeePaid1590082348180 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `INSERT INTO "transaction_status" ("name", "description", "enabled")
            VALUES ('FEE_PAID', 'Processor fee is paid', true)`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DELETE FROM "transaction_status" WHERE "name" = \'FEE_PAID\'');
    }
}
