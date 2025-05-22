import { MigrationInterface, QueryRunner } from 'typeorm';

export class addFundSlug1579349578189 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('CREATE SEQUENCE fundslug MAXVALUE 9999');
        await queryRunner.query(
            "ALTER TABLE \"fund\" ADD \"slug\" character varying NOT NULL DEFAULT to_char(CURRENT_DATE,'MONDDYY') || '-' || lpad(nextval('fundslug')::text, 4, '0')",
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund" ADD CONSTRAINT "UQ_c7c734e99fa6e02d859a55cd30d" UNIQUE ("slug")',
            undefined
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund" DROP CONSTRAINT "UQ_c7c734e99fa6e02d859a55cd30d"',
            undefined
        );
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "slug"', undefined);
        await queryRunner.query('DROP SEQUENCE fundslug');
    }
}
