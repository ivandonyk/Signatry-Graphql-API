import { MigrationInterface, QueryRunner } from 'typeorm';

export class INSERTAccessTypeCharityFavorites1612144049961 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO permission (name, description, created_on, created_by, updated_on, updated_by, version, access_level, access_type, role_id)
             SELECT
                'Charity Favorites',
                'Charity Favorites',
                now(),
                null,
                now(),
                null,
                1,
                'FULL',
                'CHARITY_FAVORITES',
                id
             FROM role;`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM permission WHERE access_type = 'CHARITY_FAVORITES';
        `);
    }
}
