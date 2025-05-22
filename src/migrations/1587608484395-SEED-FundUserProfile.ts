import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDFundUserProfile1587608484395 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            INSERT INTO fund_user_profile (fund_id, user_profile_id)
            SELECT id AS fund_id, created_by_user_profile_id AS user_profile_id
            FROM fund;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DELETE FROM fund_user_profile');
    }
}
