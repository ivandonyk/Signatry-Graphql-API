import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecipientEventTableAddNewFields1600886630491 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE "recipient_event" ADD COLUMN payment_changes JSONB
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE "recipient_event" DROP COLUMN payment_changes
    `);
    }
}
