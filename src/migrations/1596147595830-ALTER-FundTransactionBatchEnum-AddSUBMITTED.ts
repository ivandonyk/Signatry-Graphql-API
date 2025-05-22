import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionBatchEnumAddSUBMITTED1596147595830 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            -- 1. rename the enum type you want to change
            alter type fund_transaction_batch_status rename to _fund_transaction_batch_status;
            -- 2. create new type
            create type fund_transaction_batch_status as enum ('PENDING', 'SUBMITTED', 'COMPLETE');
            -- 3. rename column which uses our enum type
            alter table fund_transaction_batch rename column status to _status;
            -- 4. add new column of new type
            alter table fund_transaction_batch add status fund_transaction_batch_status not null default 'PENDING';
            -- 5. copy values to the new column
            update fund_transaction_batch set status = _status::text::fund_transaction_batch_status;
            -- 6. remove old column and type
            alter table fund_transaction_batch drop column _status;
            drop type _fund_transaction_batch_status;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            alter type fund_transaction_batch_status rename to _fund_transaction_batch_status;
            create type fund_transaction_batch_status as enum ('PENDING', 'COMPLETE');
            alter table fund_transaction_batch rename column status to _status;
            alter table fund_transaction_batch add status fund_transaction_batch_status not null default 'PENDING';
            update fund_transaction_batch set status = _status::text::fund_transaction_batch_status;
            alter table fund_transaction_batch drop column _status;
            drop type _fund_transaction_batch_status;
        `);
    }
}
