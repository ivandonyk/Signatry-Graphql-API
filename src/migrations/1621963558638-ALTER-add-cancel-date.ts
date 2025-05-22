import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERAddCancelDate1621963558638 implements MigrationInterface {
    private table = 'batch';
    private column = new TableColumn({
        name: 'canceled_on',
        type: 'timestamp without time zone',
        isNullable: true
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(this.table, this.column);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(this.table, this.column);
    }
}
