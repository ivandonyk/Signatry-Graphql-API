import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERIaTransaction1622061600916 implements MigrationInterface {
    table = 'institution_account_transaction';
    columns = [
        new TableColumn({
            name: 'transaction_name',
            type: 'character varying',
            isNullable: true
        }),
        new TableColumn({
            name: 'creation_date',
            type: 'timestamp without time zone',
            isNullable: true
        }),
        new TableColumn({
            name: 'flow_amount',
            type: 'double precision',
            isNullable: true
        }),
        new TableColumn({
            name: 'flow_units',
            type: 'double precision',
            isNullable: true
        })
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns(this.table, this.columns);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumns(this.table, this.columns);
    }
}
