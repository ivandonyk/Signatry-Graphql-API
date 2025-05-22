import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionStatusAddUnderscores1585594702826 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'UPDATE "transaction_status" SET "name" = \'READY_FOR_DIVESTMENT\' WHERE "name" = \'READY FOR DIVESTMENT\''
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'UPDATE "transaction_status" SET "name" = \'READY FOR DIVESTMENT\' WHERE "name" = \'READY_FOR_DIVESTMENT\''
        );
    }
}
