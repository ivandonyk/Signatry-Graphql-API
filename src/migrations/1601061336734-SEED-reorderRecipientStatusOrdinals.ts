import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDReorderRecipientStatusOrdinals1601061336734 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            UPDATE "recipient_status" SET "ordinal" = 1 WHERE "name" = 'EXPIRED';
        `);
        await queryRunner.query(/*sql */ `
            UPDATE "recipient_status" SET "ordinal" = 2 WHERE "name" = 'PENDING';
        `);
        await queryRunner.query(/*sql */ `
            UPDATE "recipient_status" SET "ordinal" = 3 WHERE "name" = 'APPROVED';
        `);
        await queryRunner.query(/*sql */ `
            UPDATE "recipient_status" SET "ordinal" = 4 WHERE "name" = 'DENIED';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
        UPDATE "recipient_status" SET "ordinal" = 1 WHERE "name" = 'PENDING';
    `);
        await queryRunner.query(/*sql */ `
        UPDATE "recipient_status" SET "ordinal" = 2 WHERE "name" = 'APPROVED';
    `);
        await queryRunner.query(/*sql */ `
        UPDATE "recipient_status" SET "ordinal" = 3 WHERE "name" = 'DENIED';
    `);
        await queryRunner.query(/*sql */ `
        UPDATE "recipient_status" SET "ordinal" = 4 WHERE "name" = 'EXPIRED';
    `);
    }
}
