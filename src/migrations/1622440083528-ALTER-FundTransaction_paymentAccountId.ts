import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionPaymentAccountId1622440083528 implements MigrationInterface {
    table = 'fund_transaction';
    tableColumn = 'user_profile_account_id';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE ${this.table}
            ADD ${this.tableColumn} character varying;`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE ${this.table}
            DROP ${this.tableColumn};`
        );
    }
}
