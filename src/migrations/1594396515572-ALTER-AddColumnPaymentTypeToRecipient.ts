import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddColumnPaymentTypeToRecipient1594396515572 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "CREATE TYPE recipient_payment_type AS ENUM ('ACH', 'CASH', 'MAIL', 'WIRE')"
        );
        await queryRunner.query(
            "ALTER TABLE recipient ADD COLUMN payment_type recipient_payment_type NOT NULL DEFAULT 'MAIL'"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE recipient DROP COLUMN "payment_type"');
        await queryRunner.query('DROP TYPE IF EXISTS recipient_payment_type');
    }
}
