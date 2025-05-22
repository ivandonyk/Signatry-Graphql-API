import { MigrationInterface, QueryRunner } from 'typeorm';

const tenantId = '00000000-0000-0000-0000-000000000000';
export class ADDTenantInvestmentToEmail1620330009859 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const results = await queryRunner.query(
            `select app_setting from tenant where id ='${tenantId}'`
        );
        // console.log(appSettingsJSON);
        const appSetting = results[0].app_setting;
        appSetting['investmentToEmail'] = [
            'qa.spiredigital@gmail.com',
            'investments@thesignatry.com'
        ];

        const appSettingJSON = JSON.stringify(appSetting);
        await queryRunner.query(
            `update tenant set app_setting='${appSettingJSON}' where id ='${tenantId}'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const results = await queryRunner.query(
            `select app_setting from tenant where id ='${tenantId}'`
        );

        const appSetting = results[0].app_setting;

        // delete key
        delete appSetting.investmentToEmail;

        const appSettingJSON = JSON.stringify(appSetting);
        await queryRunner.query(
            `update tenant set app_setting='${appSettingJSON}' where id ='${tenantId}'`
        );
    }
}
