import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERADDClosedDateTOFund1623194826379 implements MigrationInterface {
    table = 'fund';
    column = new TableColumn({
        name: 'closed_date',
        type: 'date',
        isNullable: true
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(this.table, this.column);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(this.table, this.column);
    }
}
