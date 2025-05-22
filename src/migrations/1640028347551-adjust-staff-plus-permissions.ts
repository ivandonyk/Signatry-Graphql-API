import {MigrationInterface, QueryRunner} from "typeorm";

export class adjustStaffPlusPermissions1640028347551 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/* sql */ `
            update permission
                set access_level = 'FULL'::permission_access_level
            from role
            where role.name = 'STAFF_PLUS'
                and access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL'::permission_access_type
                and role_id = role.id;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/* sql */ `
            update permission
                set access_level = 'READ'::permission_access_level
            from role
            where role.name = 'STAFF_PLUS'
                and access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL'::permission_access_type
                and role_id = role.id;
        `)
    }

}
