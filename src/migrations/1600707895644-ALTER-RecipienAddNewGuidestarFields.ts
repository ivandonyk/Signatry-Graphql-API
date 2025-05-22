import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecipienAddNewGuidestarFields1600707895644 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient" ADD COLUMN "bmf_organization_name" character varying
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient" ADD COLUMN "foundation_type_code" character varying
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient" ADD COLUMN "foundation_type_description" character varying
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient" ADD COLUMN "also_known_as" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE "recipient" DROP COLUMN "bmf_organization_name"
    `);
        await queryRunner.query(/*sql*/ `
        ALTER TABLE "recipient" DROP COLUMN "foundation_type_code"
    `);
        await queryRunner.query(/*sql*/ `
        ALTER TABLE "recipient" DROP COLUMN "foundation_type_description"
    `);
        await queryRunner.query(/*sql*/ `
        ALTER TABLE "recipient" DROP COLUMN "also_known_as"
    `);
    }
}
