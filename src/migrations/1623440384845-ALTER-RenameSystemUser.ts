import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRenameSystemUser1623440384845 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/* sql */ `
            UPDATE user_profile SET last_name = '' WHERE id = '00000000-0000-0000-0000-000000000000'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/* sql */ `
            UPDATE user_profile SET last_name = 'User' WHERE id = '00000000-0000-0000-0000-000000000000'
        `);
    }
}
