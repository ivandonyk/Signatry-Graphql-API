import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionStatusAddREVIEW1590977552760 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            INSERT INTO transaction_status ("name", "description") VALUES ('REVIEW', 'Final Review')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_status WHERE name = 'REVIEW'
        `);
    }
}
