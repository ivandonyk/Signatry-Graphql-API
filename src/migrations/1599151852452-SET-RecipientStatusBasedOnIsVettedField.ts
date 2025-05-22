import { MigrationInterface, QueryRunner } from 'typeorm';

export class SETRecipientStatusBasedOnIsVettedField1599151852452 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const [{ id }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM recipient_status WHERE name = 'APPROVED'
        `);
        await queryRunner.query(/*sql*/ `
            UPDATE "recipient" SET "recipient_status_id" = '${id}' WHERE "is_vetted" = true
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const [{ id }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM recipient_status WHERE name = 'PENDING'
        `);
        await queryRunner.query(/*sql*/ `
            UPDATE "recipient" SET "recipient_status_id" = '${id}' WHERE "is_vetted" = true
        `);
    }
}
