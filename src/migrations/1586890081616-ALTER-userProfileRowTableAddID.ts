import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUserProfileRowTableAddID1586890081616 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "user_profile_role" ADD COLUMN "id" uuid NOT NULL DEFAULT uuid_generate_v4()'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_role" ADD CONSTRAINT "Pk_userProfileRole" PRIMARY KEY ("id")'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "user_profile_role" DROP CONSTRAINT "Pk_userProfileRole"'
        );
        await queryRunner.query('ALTER TABLE "user_profile_role" DROP COLUMN "id"');
    }
}
