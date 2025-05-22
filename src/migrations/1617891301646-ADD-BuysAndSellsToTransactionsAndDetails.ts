import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDBuysAndSellsToTransactionsAndDetails1617891301646 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            INSERT INTO transaction_type(description, name, abbreviation) VALUES ('Purchasing a security', 'BUY', 'B'), ('Selling a security', 'SELL', 'S')
        `);

        await queryRunner.query(/*sql*/ `
           create sequence buyTransactionCode start with 1
       `);

        await queryRunner.query(/*sql*/ `
           create sequence sellTransactionCode start with 1
       `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE transaction_detail_type ALTER COLUMN name TYPE character varying;
        `);

        await queryRunner.query(/*sql*/ `
            INSERT INTO transaction_detail_type(description, name) VALUES ('Purchasing a security', 'BUY'), ('Selling a security', 'SELL')
        `);

        await queryRunner.query('DROP TYPE "transaction_detail_type_name"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            drop sequence buyTransactionCode 
        `);

        await queryRunner.query(/*sql*/ `
            drop sequence sellTransactionCode
        `);

        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_type WHERE name IN('BUY', 'SELL')
        `);

        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_deatil_type WHERE name IN('BUY', 'SELL')
        `);

        await queryRunner.query(/*sql*/ `
            CREATE TYPE "transaction_detail_type_name" AS ENUM (
                'GRANT_DIVESTMENT_CASH',
                'CASH_OUT',
                'CASH_IN',
                'INVESTMENT',
                'DIVESTMENT',
                'FEE',
                'TRANSFER_IN',
                'TRANSFER_OUT',
                'INTEREST',
                'DIVIDEND',
                'PROCESSING_FEE',
                'ADVISOR_FEE',
                'BANK_FEE'
            )
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE transaction_detail_type ALTER COLUMN name TYPE transaction_detail_type_name;
        `);
    }
}
