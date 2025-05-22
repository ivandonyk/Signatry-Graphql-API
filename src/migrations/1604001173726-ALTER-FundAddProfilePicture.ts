import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundAddProfilePicture1604001173726 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE fund ADD COLUMN "fund_photo" text
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE fund DROP COLUMN "fund_photo" 
    `);
    }
}
