import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERChangeStatusFromDivestedToPaymentInProcess1586891436040
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'UPDATE "transaction_status" SET "name" = \'PAYMENT_IN_PROCESS\' WHERE "name" = \'DIVESTED\''
        );

        await queryRunner.query(
            'UPDATE "transaction_detail_status" SET "name" = \'PAYMENT_IN_PROCESS\' WHERE "name" = \'DIVESTED\''
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'UPDATE "transaction_status" SET "name" = \'DIVESTED\' WHERE "name" = \'PAYMENT_IN_PROCESS\''
        );

        await queryRunner.query(
            'UPDATE "transaction_detail_status" SET "name" = \'DIVESTED\' WHERE "name" = \'PAYMENT_IN_PROCESS\''
        );
    }
}
