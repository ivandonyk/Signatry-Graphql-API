import { MigrationInterface, QueryRunner } from 'typeorm';

export class insertAccessTypeFUNDCREATE1612425394975 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO permission (name, description, created_on, created_by, updated_on, updated_by, version, access_level, access_type, role_id)
             SELECT
                'Fund Create',
                'Fund Create',
                now(),
                null,
                now(),
                null,
                1,
                'FULL',
                'FUND_CREATE',
                id
             FROM role;`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        DELETE FROM permission WHERE access_type = 'FUND_CREATE';
    `);
    }
}
