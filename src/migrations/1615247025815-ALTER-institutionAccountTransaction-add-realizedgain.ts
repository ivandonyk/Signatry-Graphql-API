import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInstitutionAccountTransactionAddRealizedgain1615247025815 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "institution_account_transaction" ADD COLUMN "realized_gain" float`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "institution_account_transaction" DROP COLUMN "realized_gain"`);
    }

}
