import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDSystemUserProfile1601480280474 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            INSERT INTO "app_user" (
                "username",
                "id",
                "sub"
            ) VALUES (
                'system_app_user',
                '00000000-0000-0000-0000-000000000000',
                '00000000-0000-0000-0000-000000000000'
            );
        `);

        await queryRunner.query(/* sql */ `
            INSERT INTO "user_profile" (
                "id", 
                "app_user_id", 
                "first_name", 
                "last_name"
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                '00000000-0000-0000-0000-000000000000',
                'System',
                'User'
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            DELETE FROM "user_profile" WHERE "id" = '00000000-0000-0000-0000-000000000000';
        `);
        await queryRunner.query(/* sql */ `
            DELETE FROM "app_user" WHERE "id" = '00000000-0000-0000-0000-000000000000';
    `);
    }
}
