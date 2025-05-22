import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDEnsureAllUserDefaultsPermissionsSetToFull1614278425066
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/* sql */ `
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
