import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFieldsToTenantTable1593108659817 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "tenant" ADD COLUMN "url" character varying');
        await queryRunner.query('ALTER TABLE "tenant" ADD COLUMN "phone" character varying');
        await queryRunner.query(
            'ALTER TABLE "tenant" ADD COLUMN "address_line_one" character varying'
        );
        await queryRunner.query(
            'ALTER TABLE "tenant" ADD COLUMN "city_state_zip" character varying'
        );
        await queryRunner.query(
            "UPDATE \"tenant\" SET url = 'www.signatry.com/' WHERE tenant.name = 'The Signatry'"
        );
        await queryRunner.query(
            "UPDATE \"tenant\" SET phone = '(123) 456-7890' WHERE tenant.name = 'The Signatry'"
        );
        await queryRunner.query(
            "UPDATE \"tenant\" SET address_line_one = '7171 W 95th ST #501' WHERE tenant.name = 'The Signatry'"
        );
        await queryRunner.query(
            "UPDATE \"tenant\" SET city_state_zip = 'Overland Park, Kansas City, KS 66212' WHERE tenant.name = 'The Signatry'"
        );
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "tenant" DROP COLUMN "url"');
        await queryRunner.query('ALTER TABLE "tenant" DROP COLUMN "phone"');
        await queryRunner.query('ALTER TABLE "tenant" DROP COLUMN "address_line_one"');
        await queryRunner.query('ALTER TABLE "tenant" DROP COLUMN "city_state_zip"');
    }
}
