import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDAddSubmittedToTransactionDetailStatus1613766925395 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            INSERT INTO "transaction_detail_status" ("name", "description", "enabled")
                VALUES ('SUBMITTED', 'Initially created status not counted in available amounts. Used in transfer workflow', true);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            DELETE FROM "transaction_detail_status" WHERE name = 'SUBMITTED';
        `);
    }
}
