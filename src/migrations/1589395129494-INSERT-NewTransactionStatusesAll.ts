import { MigrationInterface, QueryRunner } from 'typeorm';

export class INSERTNewTransactionStatusesAll1589395129494 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            "INSERT INTO \"transaction_status\" (name) VALUES ('SPECIAL_APPROVAL'), ('FINANCIAL_REVIEW'), ('PAYMENT_SENT'), ('PROCESSED'), ('CANCELED'), ('DENIED')"
        );
        await queryRunner.query(
            "INSERT INTO \"transaction_detail_status\" (name) VALUES ('SPECIAL_APPROVAL'), ('FINANCIAL_REVIEW'), ('PAYMENT_SENT'), ('PROCESSED'), ('CANCELED'), ('DENIED')"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            "DELETE FROM \"transaction_status\" WHERE name = ('SPECIAL_APPROVAL') or name = ('FINANCIAL_REVIEW') or name = ('PAYMENT_SENT') or name = ('PROCESSED') or name = ('CANCELED') or name = ('DENIED')"
        );
        await queryRunner.query(
            "DELETE FROM \"transaction_detail_status\" WHERE name = ('SPECIAL_APPROVAL') or name = ('FINANCIAL_REVIEW') or name = ('PAYMENT_SENT') or name = ('PROCESSED') or name = ('CANCELED') or name = ('DENIED')"
        );
    }
}
