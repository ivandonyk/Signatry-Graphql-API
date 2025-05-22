import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundCodeToNewFormat1586559299631 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('CREATE SEQUENCE fundCode START WITH 1');
        await queryRunner.query(
            'ALTER TABLE "fund" ALTER COLUMN "fund_code" DROP DEFAULT',
            undefined
        );
        await queryRunner.query('DROP SEQUENCE fundslug');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('CREATE SEQUENCE fundslug MAXVALUE 9999');
        await queryRunner.query(
            "ALTER TABLE \"fund\" ALTER COLUMN \"fund_code\" SET DEFAULT to_char(CURRENT_DATE,'MONDDYY') || '-' || lpad(nextval('fundslug')::text, 4, '0')"
        );
        await queryRunner.query('DROP SEQUENCE fundCode');
    }
}
