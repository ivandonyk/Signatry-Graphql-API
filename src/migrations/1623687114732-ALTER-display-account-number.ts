import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERDisplayAccountNumber1623687114732 implements MigrationInterface {
    table = 'institution_account';

    column = new TableColumn({
        name: 'display_account_number',
        type: 'character varying',
        isNullable: true
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(this.table, this.column);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(this.table, this.column);
    }
}
