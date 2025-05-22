import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDNewStatusesAndRenameOthers1610746726116 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            INSERT INTO transaction_status (name) VALUES ('PAYMENT_SCHEDULED')
        `);

        await queryRunner.query(/*sql*/ `
            UPDATE transaction_status SET name = 'IN_DUE_DILIGENCE' WHERE name = 'DUE_DILIGENCE_AND_VETTING'
        `);

        await queryRunner.query(/*sql*/ `
            UPDATE transaction_status SET name = 'IN_REVIEW' WHERE name = 'REVIEW'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            DELETE FROM transaction_status WHERE name = 'PAYMENT_SCHEDULED'
        `);
    }
}
