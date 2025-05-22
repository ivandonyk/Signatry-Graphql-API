import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddParentEventIdToTransactionEvent1596051636284 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "transaction_event" ADD COLUMN "parent_event_id" uuid NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "transaction_event" DROP COLUMN "parent_event_id"
        `);
    }
}
