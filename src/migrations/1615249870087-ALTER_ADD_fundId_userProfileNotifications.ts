import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERADDFundIdUserProfileNotifications1615249870087 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        ALTER TABLE user_profile_notification ADD fund_id uuid;

        ALTER TABLE user_profile_notification
        ADD CONSTRAINT user_profile_notification_fund_id_fk
        FOREIGN KEY (fund_id) REFERENCES fund;
        `);

        const [{ id: imId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM fund_role WHERE name = 'Investment Manager';
        `);

        await queryRunner.query(/*sql */ `
            DELETE FROM fund_permission WHERE name = 'Investment Settings' AND fund_role_id != '${imId}'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('select 1');
    }
}
