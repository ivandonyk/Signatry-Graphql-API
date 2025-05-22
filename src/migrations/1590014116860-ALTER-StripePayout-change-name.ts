import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERStripePayoutChangeName1590014116860 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        queryRunner.query('ALTER TABLE "stripe_payout" RENAME TO "payout"');
        queryRunner.query('ALTER TABLE "payout" RENAME COLUMN "stripe_id" TO "payout_id"');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        queryRunner.query('ALTER TABLE "payout" RENAME TO "stripe_payout"');
        queryRunner.query('ALTER TABLE "payout" RENAME COLUMN "payout_id" TO "stripe_id"');
    }
}
