import { query } from 'express';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDValueToRecipientEventEnum1600897936218 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            -- 1. rename the enum type you want to change
            ALTER TYPE recipient_event_name rename to _recipient_event_name;
            -- 2. create new type
            CREATE TYPE recipient_event_name as ENUM ('PREFERRED PAYMENT EDITED', 'EDITED', 'APPROVED', 'DENIED');
            -- 3. rename column which uses our enum type
            ALTER TABLE recipient_event rename column name to _name;
            -- 4. add new column of new type
            ALTER TABLE recipient_event add name recipient_event_name;
            -- 5. copy values to the new column
            UPDATE recipient_event set name = _name::text::recipient_event_name;
            -- 6. remove old column and type
            ALTER TABLE recipient_event DROP COLUMN _name;
            DROP TYPE _recipient_event_name;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TYPE recipient_event_name rename to _recipient_event_name;
            CREATE TYPE recipient_event_name as ENUM ('EDITED', 'APPROVED', 'DENIED');
            ALTER TABLE recipient_event rename column name to _name;
            ALTER TABLE recipient_event add name recipient_event_name;
            UPDATE recipient_event set name = _name::text::recipient_event_name;
            ALTER TABLE recipient_event DROP COLUMN _name;
            DROP TYPE _recipient_event_name;
        `);
    }
}
