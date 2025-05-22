import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecipientKeywords1598061954740 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient ADD COLUMN "keywords" text[] NOT NULL DEFAULT array[]::text[];
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient DROP COLUMN "keywords";
        `);
    }
}
