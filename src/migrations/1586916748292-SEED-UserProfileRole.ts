import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDUserProfileRole1586916748292 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        // get IDs of profiles that have no role defined
        const profileIds = await queryRunner
            .query(
                `
                    SELECT id FROM user_profile
                    WHERE id NOT IN (
                        SELECT user_profile_id FROM user_profile_role
                    )
                `
            )
            .then(results => results.map((result: { id: string }) => result.id));

        // get ID of 'User' role
        const [{ id: userRoleId }] = await queryRunner.query(
            "SELECT id FROM role WHERE name = 'User'"
        );

        // create user_profile_role for these profiles as 'User'
        await Promise.all(
            profileIds.map((profileId: string) => {
                return queryRunner.query(
                    `INSERT INTO user_profile_role (user_profile_id, role_id) VALUES ('${profileId}', '${userRoleId}')`
                );
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DELETE FROM user_profile_role');
    }
}
