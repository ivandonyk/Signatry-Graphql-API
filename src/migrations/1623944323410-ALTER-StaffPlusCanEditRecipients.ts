import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERStaffPlusCanEditRecipients1623944323410 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            UPDATE permission
            SET access_level = 'FULL'
            WHERE access_type = 'CHARITY_PROFILE'
                AND role_id = (SELECT id FROM role WHERE name = 'STAFF_PLUS');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            UPDATE permission
            SET access_level = 'READ'
            WHERE access_type = 'CHARITY_PROFILE'
                AND role_id = (SELECT id FROM role WHERE name = 'STAFF_PLUS');
        `);
    }
}
