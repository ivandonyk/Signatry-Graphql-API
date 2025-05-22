import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUserProfileAddPrefixAndSuffix1603125985530 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "user_profile" ADD COLUMN "suffix" character varying NULL'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile" ADD COLUMN "prefix" character varying NULL'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "user_profile" DROP COLUMN "suffix" character varying NULL'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile" DROP COLUMN "prefix" character varying NULL'
        );
    }
}
