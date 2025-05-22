import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUpdatePaymentTypeEnumRecipient1600188880868 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TYPE "recipient_payment_type" RENAME TO "_recipient_payment_type"'
        );
        await queryRunner.query(`
            CREATE TYPE "recipient_payment_type" AS ENUM (
                'Check', 
                'ACH', 
                'Wire'
            )
        `);
        await queryRunner.query(
            'ALTER TABLE "recipient" RENAME COLUMN "payment_type" TO "_payment_type"'
        );
        await queryRunner.query(
            'ALTER TABLE "recipient" ADD COLUMN payment_type recipient_payment_type NULL'
        );
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "_payment_type"');
        await queryRunner.query('DROP TYPE "_recipient_payment_type"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TYPE "recipient_payment_type" RENAME TO "_recipient_payment_type"'
        );
        await queryRunner.query(`
        CREATE TYPE "recipient_payment_type" AS ENUM (
            'ACH', 
            'CASH', 
            'MAIL',
            'WIRE'
        )
    `);
        await queryRunner.query(
            'ALTER TABLE "recipient" RENAME COLUMN "payment_type" TO "_payment_type"'
        );
        await queryRunner.query(
            "ALTER TABLE recipient ADD COLUMN payment_type recipient_payment_type NOT NULL DEFAULT 'MAIL'"
        );
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "_payment_type"');
        await queryRunner.query('DROP TYPE "_recipient_payment_type"');
    }
}
