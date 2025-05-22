import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddRecipientCodeSequence1597869030930 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "recipient" ADD "recipient_code" character varying NULL',
            undefined
        );

        await queryRunner.query(
            'ALTER TABLE "recipient" ADD CONSTRAINT "UQ_RecipientCode" UNIQUE ("recipient_code")',
            undefined
        );
        await queryRunner.query('CREATE SEQUENCE recipientCode START WITH 1');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP SEQUENCE recipientCode');
        await queryRunner.query('ALTER TABLE "recipient" DROP CONSTRAINT "UQ_RecipientCode"');
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "recipient_code"');
    }
}
