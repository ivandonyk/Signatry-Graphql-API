import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDTenantGoLiveDate1621953920147 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE tenant ADD COLUMN golive_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE tenant DROP COLUMN IF EXISTS golive_date;');
    }
}
