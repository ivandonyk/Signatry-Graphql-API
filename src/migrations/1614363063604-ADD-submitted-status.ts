import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDSubmittedStatus1614363063604 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        INSERT INTO transaction_status ("name", "description") VALUES ('SUBMITTED', 'initial submission')
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        DELETE FROM transaction_status WHERE name = 'SUBMITTED'
    `);
    }
}
