import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecipientStatusToAddNewOrdinalField1599097199505 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "recipient_status" ADD COLUMN "ordinal" INTEGER');
        await queryRunner.query(/*sql */ `
            UPDATE "recipient_status" SET "ordinal" = 1 WHERE "name" = 'PENDING'
        `);

        await queryRunner.query(/*sql */ `
            UPDATE "recipient_status" SET "ordinal" = 2 WHERE "name" = 'APPROVED'
        `);

        await queryRunner.query(/*sql */ `
            UPDATE "recipient_status" SET "ordinal" = 3 WHERE "name" = 'DENIED'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "recipient_status" DROP COLUMN "ordinal"');
    }
}
