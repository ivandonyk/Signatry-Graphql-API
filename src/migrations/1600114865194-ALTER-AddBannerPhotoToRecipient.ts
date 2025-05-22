import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddBannerPhotoToRecipient1600114865194 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('ALTER TABLE "recipient" ADD COLUMN "banner" character varying NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "banner"');
    }
}
