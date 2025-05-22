import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ALTERAddOnHoldToFundTransactionDetail1623163669273 implements MigrationInterface {
    table = 'fund_transaction_detail';
    column = new TableColumn({
        name: 'on_hold',
        type: 'boolean',
        isNullable: false,
        default: false
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(this.table, this.column);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(this.table, this.column);
    }
}
