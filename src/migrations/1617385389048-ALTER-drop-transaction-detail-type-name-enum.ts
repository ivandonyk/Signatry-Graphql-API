import { MigrationInterface, QueryRunner } from 'typeorm';

const table = 'transaction_type';
const rows = [
    {
        name: 'INVESTMENT_FEE',
        description: 'Fee incurred during the investment/divestment',
        abbreviation: 'IF'
    },
    { name: 'ADMINISTRATION_FEE', description: 'Generic administrative fee', abbreviation: 'AE' }
];

export class ALTERDropTransactionDetailTypeNameEnum1617385389048 implements MigrationInterface {
    name?: string;
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO 
                ${table} (name, description, abbreviation)
            VALUES 
                ${rows
                    .map(row => `('${row.name}', '${row.description}', '${row.abbreviation}')`)
                    .join(',\n')}`);

        await Promise.all(
            rows.map(row =>
                queryRunner.query(
                    `CREATE SEQUENCE ${row.name.toLowerCase()}TransactionCode START WITH 1`
                )
            )
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM ${table}
                WHERE name IN (${rows.map(r => `'${r.name}'`).join(',')});
            `);

        await Promise.all(
            rows.map(row =>
                queryRunner.query(`DROP SEQUENCE ${row.name.toLowerCase()}TransactionCode`)
            )
        );
    }
}
