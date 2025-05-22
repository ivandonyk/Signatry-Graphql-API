import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERHoldingDateType1623715154107 implements MigrationInterface {
    getConstraintQueryString = (action: string) => `ALTER TABLE institution_account_transaction
        drop constraint "FK_HoldingId",
        add constraint "FK_HoldingId" 
            FOREIGN KEY("holding_id") 
            REFERENCES "holding"("id") 
            ON DELETE ${action}
            ON UPDATE NO ACTION`;

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(this.getConstraintQueryString('CASCADE'));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(this.getConstraintQueryString('NO ACTION'));
    }
}
