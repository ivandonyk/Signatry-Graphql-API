import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERAddStatusInstitionAccountTransaction1620837544360 implements MigrationInterface {
    table = 'institution_account_transaction';
    tableColumn = new TableColumn({
        name: 'is_ignored',
        type: 'boolean',
        default: false
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(this.table, this.tableColumn);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(this.table, this.tableColumn.name);
    }
}
