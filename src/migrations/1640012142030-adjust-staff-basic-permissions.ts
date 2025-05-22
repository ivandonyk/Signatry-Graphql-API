import { MigrationInterface, QueryRunner } from "typeorm";

/** 
    More info here: https://giveinteractive.atlassian.net/browse/GD-96

    In this migration:
    - Grant `STAFF_BASIC` `FULL` access on `ADMIN_FUNDS`, `ADMIN_BANK_ACCOUNTS`, and `ADMIN_CONTRIBUTIONS`
*/
export class adjustStaffBasicPermissions1640012142030 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        queryRunner.query(/* sql */ `
            update permission
                set access_level = 'FULL'::permission_access_level
            from role
            where role.name = 'STAFF_BASIC'
                and access_type = 'ADMIN_FUNDS'::permission_access_type
                and role_id = role.id;
        `)

        queryRunner.query(/* sql */ `
            update permission
                set access_level = 'FULL'::permission_access_level
            from role
            where role.name = 'STAFF_BASIC'
                and access_type = 'ADMIN_BANK_ACCOUNTS'::permission_access_type
                and role_id = role.id;
        `)

        queryRunner.query(/* sql */ `
            update permission
                set access_level = 'FULL'::permission_access_level
            from role
            where role.name = 'STAFF_BASIC'
                and access_type = 'ADMIN_CONTRIBUTIONS'::permission_access_type
                and role_id = role.id;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert back to NONE permissions

        queryRunner.query(/* sql */ `
            update permission
                set access_level = 'READ'::permission_access_level
            from role
            where role.name = 'STAFF_BASIC'
                and access_type = 'ADMIN_FUNDS'::permission_access_type
                and role_id = role.id;
        `)

        queryRunner.query(/* sql */ `
            update permission
                set access_level = 'NONE'::permission_access_level
            from role
            where role.name = 'STAFF_BASIC'
                and access_type = 'ADMIN_BANK_ACCOUNTS'::permission_access_type
                and role_id = role.id;
        `)

        queryRunner.query(/* sql */ `
            update permission
                set access_level = 'NONE'::permission_access_level
            from role
            where role.name = 'STAFF_BASIC'
                and access_type = 'ADMIN_CONTRIBUTIONS'::permission_access_type
                and role_id = role.id;
        `)        
    }
}
