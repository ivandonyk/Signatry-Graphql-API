import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUserProfileRole1587052665048 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "user_profile_role" ADD COLUMN "created_by" uuid NULL'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_role" ADD COLUMN "updated_by" uuid NULL'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_role" ADD COLUMN "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_role" ADD COLUMN "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_role" ADD COLUMN "enabled" boolean NOT NULL DEFAULT true'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_role" ADD COLUMN "version" integer NOT NULL DEFAULT 1'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "user_profile_role" DROP COLUMN "created_by"');
        await queryRunner.query('ALTER TABLE "user_profile_role" DROP COLUMN "updated_by"');
        await queryRunner.query('ALTER TABLE "user_profile_role" DROP COLUMN "created_on"');
        await queryRunner.query('ALTER TABLE "user_profile_role" DROP COLUMN "updated_on"');
        await queryRunner.query('ALTER TABLE "user_profile_role" DROP COLUMN "enabled"');
        await queryRunner.query('ALTER TABLE "user_profile_role" DROP COLUMN "version"');
    }
}
