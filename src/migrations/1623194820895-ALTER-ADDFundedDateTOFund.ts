import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERADDFundedDateTOFund1623194820895 implements MigrationInterface {
    table = 'fund';
    column = new TableColumn({
        name: 'funded_date',
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
