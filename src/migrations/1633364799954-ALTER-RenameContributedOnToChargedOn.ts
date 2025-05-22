import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRenameContributedOnToChargedOn1633364799954 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/* sql */ `
            ALTER TABLE "fund_transaction" RENAME COLUMN "contributed_on" TO "charged_on"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/* sql */ `
            ALTER TABLE "fund_transaction" RENAME COLUMN "charged_on" TO "contributed_on"
        `);
    }
}
