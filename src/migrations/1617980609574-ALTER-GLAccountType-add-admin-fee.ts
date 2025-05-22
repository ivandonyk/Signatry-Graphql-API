import { MigrationInterface, QueryRunner } from 'typeorm';

const type = 'gl_account_type_name';
const table = 'gl_account_type';
const column = 'name';
const currentEnum = `
'PRIMARY', 
'CONTRIBUTION_REVENUE', 
'POOL_PASSTHROUGH', 
'INVESTMENT', 
'GRANT_DISBURSEMENT', 
'GRANT_RECIPIENT',
'CREDIT_CARD_FEES'`;
const glType = 'ADMIN_FEE';

export class ALTERGLAccountTypeAddAdminFee1617980609574 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // delete enum
        await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE VARCHAR`);
        await queryRunner.query(`DROP TYPE "${type}"`);

        // add new 'ADMIN_FEE' record
        await queryRunner.query(`
            INSERT INTO "${table}" ("name", "label", "description")
            VALUES 
            ('${glType}', 'Admin Fee', 'Administration and investment fee.')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // delete records
        await queryRunner.query(`DELETE FROM "gl_account_account_type" WHERE "gl_account_type_id" = (
            SELECT id FROM ${table} WHERE "${column}" = '${glType}'
        )`);
        await queryRunner.query(`DELETE FROM "${table}" WHERE "${column}" = '${glType}'`);
        // update type
        await queryRunner.query(`CREATE TYPE "${type}" AS ENUM (${currentEnum})`);
        // update column
        await queryRunner.query(
            `ALTER TABLE "${table}" 
                ALTER COLUMN "${column}" TYPE "${type}" USING ${column}::${type}`
        );
    }
}
