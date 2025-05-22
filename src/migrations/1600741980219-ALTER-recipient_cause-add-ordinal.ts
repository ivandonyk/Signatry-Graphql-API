import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecipientCauseAddOrdinal1600741980219 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "recipient_cause" ADD COLUMN "ordinal" INTEGER DEFAULT 1'
        );

        await queryRunner.query(/*sql*/ `
            UPDATE recipient_cause
            SET ordinal = result.row_number
            FROM (
                SELECT id, recipient_id, is_primary,
                (row_number() OVER(PARTITION BY recipient_id ORDER BY (case when is_primary then 1 else 2 end)))
                from recipient_cause
            ) result
            WHERE result.id = recipient_cause.id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "recipient_cause" DROP COLUMN "ordinal"');
    }
}
