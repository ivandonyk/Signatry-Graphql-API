import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDTransactionTypesAddRebalanceType1618092991736 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            INSERT INTO transaction_type(description, name, abbreviation) VALUES ('', 'REBALANCE', 'RB')
        `);

        await queryRunner.query(/*sql*/ `
            INSERT INTO transaction_detail_type(description, name) VALUES ('Internal fund transfer as a result of a rebalance.', 'TRANSFER')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_type WHERE name = 'REBALANCE'
        `);

        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_detail_type WHERE name = 'TRANSFER'
        `);
    }
}
