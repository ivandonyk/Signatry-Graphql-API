import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUserProfileAddProfilePicColumn1603138321659 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE user_profile ADD COLUMN "profile_picture" text
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE user_profile DROP COLUMN "profile_picture" 
    `);
    }
}
