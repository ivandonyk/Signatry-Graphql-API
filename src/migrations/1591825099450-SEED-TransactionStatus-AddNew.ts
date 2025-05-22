import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDTransactionStatusAddNew1591825099450 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'INSERT INTO "transaction_status" ("name", "description", "enabled") VALUES (\'NEW\', \'Newly created FundTransaction\', true)'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DELETE FROM "transaction_status" WHERE "name" = \'NEW\'');
    }
}
