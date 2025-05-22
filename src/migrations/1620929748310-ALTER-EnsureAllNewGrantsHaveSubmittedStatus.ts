import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTEREnsureAllNewGrantsHaveSubmittedStatus1620929748310 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const [{ id: newId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_status WHERE name = 'NEW';
        `);
        const [{ id: submittedId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_status WHERE name = 'SUBMITTED';
        `);

        const [{ id: grantId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_type WHERE name = 'GRANT';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE fund_transaction SET transaction_status_id = '${submittedId}' WHERE transaction_status_id = '${newId}' AND transaction_type_id = '${grantId}';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const [{ id: newId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_status WHERE name = 'NEW';
        `);
        const [{ id: submittedId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_status WHERE name = 'SUBMITTED';
        `);

        const [{ id: grantId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM transaction_type WHERE name = 'GRANT';
        `);

        await queryRunner.query(/* sql */ `
            UPDATE fund_transaction SET transaction_status_id = '${newId}' WHERE transaction_status_id = '${submittedId}' AND transaction_type_id = '${grantId}';
        `);
    }
}
