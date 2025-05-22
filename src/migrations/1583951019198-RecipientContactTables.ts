import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecipientContactTables1583951019198 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "recipient_contact" DROP COLUMN "first_name"');
        await queryRunner.query('ALTER TABLE "recipient_contact" DROP COLUMN "last_name"');
        await queryRunner.query(
            'ALTER TABLE "recipient_contact" ADD COLUMN "org_contact_name" character varying NULL'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "recipient_contact" ADD COLUMN "first_name" character varying NULL'
        );
        await queryRunner.query(
            'ALTER TABLE "recipient_contact" ADD COLUMN "last_name" character varying NULL'
        );
        await queryRunner.query('ALTER TABLE "recipient_contact" DROP COLUMN "org_contact_name"');
    }
}
