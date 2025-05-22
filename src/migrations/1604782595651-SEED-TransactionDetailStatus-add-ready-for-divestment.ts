import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDTransactionDetailStatusAddReadyForDivestment1604782595651
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        INSERT INTO "transaction_detail_status" ("name", "description") VALUES
        ('READY_FOR_DIVESTMENT', 'Grant funds are ready to be divested')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        DELETE FROM "transaction_detail_status" 
        WHERE "name" = 'READY_FOR_DIVESTMENT'
        `);
    }
}
