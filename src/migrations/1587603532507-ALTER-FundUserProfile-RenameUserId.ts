import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundUserProfileRenameUserId1587603532507 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        queryRunner.query(
            'ALTER TABLE "fund_user_profile" RENAME COLUMN "user_id" TO "user_profile_id";'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        queryRunner.query(
            'ALTER TABLE "fund_user_profile" RENAME COLUMN "user_profile_id" TO "user_id";'
        );
    }
}
