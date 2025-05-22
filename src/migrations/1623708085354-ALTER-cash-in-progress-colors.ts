import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERCashInProgressColors1623708085354 implements MigrationInterface {
    updateColorQueryString = `UPDATE investment 
        SET visualization_color = $1
        WHERE investment_type IN ('CONTRIBUTION_CASH', 'GRANT_CASH')`;

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(this.updateColorQueryString, ['#C7CCD1']);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(this.updateColorQueryString, ['#8C510A']);
    }
}
