import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDGrantSeriesAndContributionSeriesToTrasactionType1608244643390
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE SEQUENCE contribution_seriesTransactionCode START WITH 1');
        await queryRunner.query('CREATE SEQUENCE grant_seriesTransactionCode START WITH 1');
        await queryRunner.query(/*sql*/ `
        INSERT INTO transaction_type(name, abbreviation) VALUES ('CONTRIBUTION_SERIES', 'CS'), ('GRANT_SERIES', 'GS')
        `);

        await queryRunner.query(/*sql*/ `
              UPDATE fund_transaction SET transaction_recurrence_id = null WHERE transaction_recurrence_id IS NOT NULL
          `);

        await queryRunner.query(/*sql */ `
          DELETE from transaction_recurrence
          `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        DELETE FROM transaction_type WHERE name = 'CONTRIBUTION_SERIES'
        `);

        await queryRunner.query(/*sql*/ `
        DELETE FROM transaction_type WHERE name = 'GRANT_SERIES'
        `);

        await queryRunner.query(/*sql*/ `
        ALTER TABLE transaction_recurrence DROP COLUMN transaction_ref
        `);
    }
}
