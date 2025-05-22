import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDEnsureAllUserDefaultsPermissionsSetToFull1614281992840
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/* sql */ `
            UPDATE permission SET access_level = 'FULL' WHERE access_type = 'USER_DEFAULTS';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Deliberately left blank. This change should not be reverted.
    }
}
