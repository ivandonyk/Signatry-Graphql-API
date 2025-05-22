import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDAddInternalTransferToTransactionType1618852448620 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            INSERT INTO transaction_type(description, name, abbreviation) VALUES ('Internal Transfer', 'INTERNAL_TRANSFER', 'IT');
        `);

        await queryRunner.query(/*sql*/ `
            CREATE SEQUENCE internal_transferTransactionCode START WITH 1;
       `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_type WHERE name IN('INTERNAL_TRANSFER');
        `);

        await queryRunner.query(/*sql*/ `
            DROP SEQUENCE internal_transferTransactionCode;
       `);
    }
}
