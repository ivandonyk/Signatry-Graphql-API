import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecipientSocialMediaLinks1598295391461 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient ADD COLUMN "social_media_links" text[] NOT NULL DEFAULT array[]::text[];
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient DROP COLUMN "social_media_links";
        `);
    }
}
