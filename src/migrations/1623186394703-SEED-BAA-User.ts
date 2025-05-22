import {MigrationInterface, QueryRunner} from "typeorm";

export class SEEDBAAUser1623186394703 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO byallaccounts_user (user_id, login_name, login_pass, first_name, last_name, email, financial_profile_id, tenant_id) VALUES ('1', 'erikleon_test', '9a51df86edc652304f73f11aeddc7ed1deda747c900ec97da0a5265d2e919529da12480361b3cae51053a6e61e496c6d17d6c11a05f27ee634c1811f60326ac2d775c256159a60c8e76a62cf9ea67b4b0a6d34121a57545e393a519923a80fcf649f27bc1bc411b3c7ee6e', 'Erik', 'Leon', 'erik@spiredigital.com', '696073', '00000000-0000-0000-0000-000000000000')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
