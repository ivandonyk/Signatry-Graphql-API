import { MigrationInterface, QueryRunner } from 'typeorm';

export const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

export const DEFAULT_TENANT_NAME = 'TENANT';

export const DEFAULT_TENANT_APP_SETTINGS = {
    password: {
        minLength: 8,
        requireNumberCharacter: true,
        requireSpecialCharacter: true,
        requireLowerCaseCharacter: true,
        requireUpperCaseCharacter: true
    }
};

export class initTenant1576013918229 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        queryRunner.query(
            `INSERT INTO "tenant" (id, name, app_settings) VALUES ('${EMPTY_UUID}','${DEFAULT_TENANT_NAME}','${JSON.stringify(
                DEFAULT_TENANT_APP_SETTINGS
            )}')`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        return Promise.resolve();
    }
}
