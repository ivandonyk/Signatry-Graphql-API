import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddGSPublicProfile1599145611269 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(
            'ALTER TABLE "recipient" ADD COLUMN "guidestar_public_profile_link" character varying NULL;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "guidestar_public_profile_link";');
    }
}
