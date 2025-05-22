import { MigrationInterface, QueryRunner } from 'typeorm';

const table = 'transaction_detail_status';
const statusName = 'SCHEDULED';
const description = 'Status for scheduled upcoming/series items';
const enabled = true;

export class ALTERTransactionDetailStatusSCHEDSTATUS1622440025941 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO "${table}" (
                name,
                description,
                enabled
            ) 
                VALUES (
                    '${statusName}',
                    '${description}',
                    '${enabled}'
                );`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM ${table}
            WHERE name = ${statusName};`
        );
    }
}
