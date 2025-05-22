import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDMetaColumnToFundTransaction1612215877405 implements MigrationInterface {
    name?: string;
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            create sequence transfer_inTransactionCode start with 1
        `);
        await queryRunner.query(/*sql*/ `
            create sequence transfer_outTransactionCode start with 1
        `);
        await queryRunner.query(/*sql */ `
            alter type transaction_detail_type_name rename to _transaction_detail_type_name
        `);
        await queryRunner.query(/*sql */ `
            create type transaction_detail_type_name as enum (
                'GRANT_DIVESTMENT_CASH',
                'GRANT_PAYMENT_CASH',
                'CONTRIBUTION_CASH',
                'INVESTMENT',
                'DIVESTMENT',
                'FEE',
                'TRANSFER_IN',
                'TRANSFER_OUT'
            )
        `);
        await queryRunner.query(/*sql */ `
            alter table transaction_detail_type rename column name TO _name
        `);
        await queryRunner.query(/*sql */ `
            alter table transaction_detail_type add column name transaction_detail_type_name default 'INVESTMENT'
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'GRANT_PAYMENT_CASH' where _name = 'GRANT_PAYMENT_CASH'
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'GRANT_DIVESTMENT_CASH' where _name = 'GRANT_DIVESTMENT_CASH'
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'CONTRIBUTION_CASH' where _name = 'CONTRIBUTION_CASH'
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'INVESTMENT' where _name = 'INVESTMENT'
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'DIVESTMENT' where _name = 'DIVESTMENT'
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'FEE' where _name = 'FEE'
        `);
        await queryRunner.query(/*sql */ `
            alter table transaction_detail_type drop column _name
        `);
        await queryRunner.query(/*sql*/ `
            insert into transaction_type(name, abbreviation) values ('TRANSFER_OUT', 'TO'), ('TRANSFER_IN', 'TI')
        `);
        await queryRunner.query(/*sql*/ `
            insert into transaction_detail_type(name, description) values ('TRANSFER_OUT', 'Tranfer out of the source fund'), ('TRANSFER_IN', 'Tranfer into the destination fund')
        `);
        await queryRunner.query(/*sql*/ `
            alter table fund_transaction add column metadata JSONB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            alter table fund_transaction drop column metadata
        `);

        await queryRunner.query(/*sql */ `
            alter type transaction_detail_type_name rename to _transaction_detail_type_name
        `);
        await queryRunner.query(/*sql */ `
            create type transaction_detail_type_name as enum (
                'GRANT_DIVESTMENT_CASH',
                'GRANT_PAYMENT_CASH',
                'CONTRIBUTION_CASH',
                'INVESTMENT',
                'DIVESTMENT',
                'FEE',
            )
        `);
        await queryRunner.query(/*sql */ `
            alter table transaction_detail_type rename column name TO _name
        `);
        await queryRunner.query(/*sql */ `
            alter table transaction_detail_type add column name transaction_detail_type_name
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'GRANT_PAYMENT_CASH' where _name = 'GRANT_PAYMENT_CASH'
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'GRANT_DIVESTMENT_CASH' where _name = 'GRANT_DIVESTMENT_CASH'
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'CONTRIBUTION_CASH' where _name = 'CONTRIBUTION_CASH'
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'INVESTMENT' where _name = 'INVESTMENT'
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'DIVESTMENT' where _name = 'DIVESTMENT'
        `);
        await queryRunner.query(/*sql */ `
            update transaction_detail_type set name = 'FEE' where _name = 'FEE'
        `);
        await queryRunner.query(/*sql */ `
            alter table transaction_detail_type drop column _name
        `);
    }
}
