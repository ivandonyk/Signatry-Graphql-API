import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERDropIsVetted1599167732447 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "is_vetted";');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "recipient" ADD COLUMN "is_vetted" boolean NULL;');

        const [{ id: pendingId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM recipient_status WHERE name = 'PENDING'
        `);
        const [{ id: approvedId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM recipient_status WHERE name = 'APPROVED'
        `);
        const [{ id: deniedId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM recipient_status WHERE name = 'DENIED'
        `);

        await queryRunner.query(/*sql*/ `
            UPDATE "recipient" SET "is_vetted" = 'true' WHERE "recipient_status_id" = '${approvedId}';
        `);
        await queryRunner.query(/*sql*/ `
            UPDATE "recipient" SET "is_vetted" = 'false' WHERE ("recipient_status_id" = '${pendingId}' OR "recipient_status_id" = '${deniedId}');
        `);
    }
}
