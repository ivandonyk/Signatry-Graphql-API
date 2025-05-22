import { MigrationInterface, QueryRunner } from 'typeorm';

export class FIXFixTypoInSeed1605195341744 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "tenant" SET "url" = 'www.thesignatry.com' WHERE "name" = 'The Signatry'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "tenant" SET "url" = 'www.signatry.com' WHERE "name" = 'The Signatry'
        `);
    }
}
