import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDNewTransactionTypes1616788745800 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            INSERT INTO transaction_type(description, name, abbreviation) VALUES ('Fee incurred for processing a transaction', 'PROCESSING_FEE', 'PE'), ('Fee incurred from the financial advisor on transaction', 'ADVISOR_FEE', 'AF'), ('Fee incured from the bank','BANK_FEE', 'BF'), ('Distribution of gains','DIVIDEND', 'D'), ('Interest of gains','INTEREST', 'I')
        `);

        await queryRunner.query(/*sql*/ `
            create sequence interestTransactionCode start with 1
        `);

        await queryRunner.query(/*sql*/ `
            create sequence dividendTransactionCode start with 1
        `);

        await queryRunner.query(/*sql*/ `
            create sequence processing_feeTransactionCode start with 1
        `);

        await queryRunner.query(/*sql*/ `
            create sequence bank_feeTransactionCode start with 1
        `);

        await queryRunner.query(/*sql*/ `
            create sequence advisor_feeTransactionCode start with 1
        `);

        await queryRunner.query(
            'ALTER TYPE "transaction_detail_type_name" RENAME TO "_transaction_detail_type_name"'
        );

        await queryRunner.query(`
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
            )`);

        await queryRunner.query(`
        ALTER TABLE "transaction_detail_type" 
        RENAME COLUMN "name" TO "_name"
        `);

        await queryRunner.query(`
        ALTER TABLE "transaction_detail_type" 
        ADD COLUMN "name" "transaction_detail_type_name"
        `);

        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'CASH_OUT' WHERE "_name" = 'CASH_OUT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'CASH_IN' WHERE "_name" = 'CASH_IN'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'INVESTMENT' WHERE "_name" = 'INVESTMENT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'DIVESTMENT' WHERE "_name" = 'DIVESTMENT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'GRANT_DIVESTMENT_CASH' WHERE "_name" = 'GRANT_DIVESTMENT_CASH'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'FEE' WHERE "_name" = 'FEE'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'TRANSFER_IN' WHERE "_name" = 'TRANSFER_IN'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'TRANSFER_OUT' WHERE "_name" = 'TRANSFER_OUT'
        `);

        await queryRunner.query('ALTER TABLE "transaction_detail_type" DROP COLUMN "_name"');

        await queryRunner.query(/*sql*/ `
            INSERT INTO transaction_detail_type(description, name) VALUES ('Used to track interest of a specific fund detail', 'INTEREST'), ('Distrubtion of gains', 'DIVIDEND'), ('Fee incurred for processing a transaction', 'PROCESSING_FEE'), ('Fee incurred from the financial advisor on transaction', 'ADVISOR_FEE'), ('Fee incured from the bank','BANK_FEE')
        `);

        await queryRunner.query('DROP TYPE "_transaction_detail_type_name"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_type WHERE name IN('PROCESSING_FEE', 'ADVISOR_FEE', 'BANK_FEE', 'DIVIDEND', "INTEREST")
        `);

        await queryRunner.query(
            'ALTER TYPE "transaction_detail_type_name" RENAME TO "_transaction_detail_type_name"'
        );

        await queryRunner.query(`
            CREATE TYPE "transaction_detail_type_name" AS ENUM (
                'GRANT_DIVESTMENT_CASH',
                'CASH_OUT',
                'CASH_IN',
                'INVESTMENT',
                'DIVESTMENT',
                'FEE',
                'TRANSFER_IN',
                'TRANSFER_OUT'
            )`);

        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_detail_type WHERE name IN('PROCESSING_FEE', 'ADVISOR_FEE', 'BANK_FEE', 'DIVIDEND', "INTEREST")
        `);

        await queryRunner.query('DROP TYPE "_transaction_detail_type_name"');
    }
}
