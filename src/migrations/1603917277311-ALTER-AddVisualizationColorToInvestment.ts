import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddVisualizationColorToInvestment1603917277311 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add default colors to tenant settings
        const defaultColors = [
            '#DDA200',
            '#D6644D',
            '#3EA9AB',
            '#9D3FB0',
            '#4F9A00',
            '#E6842A',
            '#9A3E25',
            '#005D6E',
            '#7C715E',
            '#DBA7AE',
            '#3C5400',
            '#69B89E',
            '#A0781B',
            '#5B9AD6',
            '#95A17E'
        ];

        const highchartsColors = [
            // See https://api.highcharts.com/highcharts/colors
            '#7cb5ec',
            '#434348',
            '#90ed7d',
            '#f7a35c',
            '#8085e9',
            '#f15c80',
            '#e4d354',
            '#2b908f',
            '#f45b5b',
            '#91e8e1'
        ];

        const DEFAULT_COLOR = '#000000';

        const [tenantSettings] = await queryRunner.query(
            'SELECT "app_setting" FROM "tenant" LIMIT 1;'
        );

        tenantSettings.app_setting.visualizationColors = defaultColors;

        await queryRunner.query(
            `UPDATE "tenant" SET "app_setting" = '${JSON.stringify(tenantSettings.app_setting)}';`
        );

        // Add the visualizationColor column
        await queryRunner.query(
            `ALTER TABLE "investment" ADD COLUMN "visualization_color" character varying NOT NULL DEFAULT \'${DEFAULT_COLOR}\';`
        );

        /**
         * Assign existing Investments a color
         */

        // Pools simply take from the default colors in order of their ordinal column
        const pools = await queryRunner.query(
            'SELECT * FROM "investment" WHERE "investment_type" = \'POOL\' ORDER BY "order_num";'
        );

        await Promise.all(
            pools.map(async (pool, index: number) => {
                // If we've run out of bounds of the default colors array, start using the default highcharts colors
                const color =
                    index <= defaultColors.length - 1
                        ? defaultColors[index]
                        : highchartsColors[index - defaultColors.length];

                await queryRunner.query(/* sql */ `
                    UPDATE "investment"
                    SET "visualization_color" = '${color}'
                    WHERE "id" = '${pool.id}';
                `);
            })
        );

        // IMAs need to be specific across multiple funds owned by a user
        const users = await queryRunner.query('SELECT * FROM user_profile;');

        const imasForUser = await users.reduce(async (userImas, user) => {
            const acc = await userImas;

            const fundsForUser = await queryRunner.query(/* sql */ `
                    SELECT * FROM "fund"
                    INNER JOIN fund_user_profile ON (fund_user_profile.fund_id = fund.id)
                    WHERE "user_profile_id" = '${user.id}';
                `);

            const imasForFund = await Promise.all(
                fundsForUser.map(async fund => {
                    return await queryRunner.query(/* sql */ `
                            SELECT *
                            FROM "fund_investment"
                            LEFT JOIN "investment" ON "investment".id = "fund_investment".investment_id
                            WHERE "fund_id" = '${fund.fund_id}'
                                AND "investment"."investment_type" = \'IMA\';
                        `);
                })
            );

            acc.push(...imasForFund);
            return acc;
        }, Promise.resolve([]));

        await Promise.all(
            imasForUser.map(async userImas => {
                await Promise.all(
                    userImas.map(async (ima, index) => {
                        // Check the color to see if it has already been set
                        const [existingColor] = await queryRunner.query(/* sql */ `
                            SELECT "visualization_color" FROM "investment" WHERE "id" = '${ima.investment_id}'
                        `);

                        if (existingColor.visualization_color === DEFAULT_COLOR) {
                            // If we've run out of bounds of the default colors array, start using the default highcharts colors
                            // Account for the number of pools when accessing the color array(s)
                            const color =
                                index + pools.length <= defaultColors.length - 1
                                    ? defaultColors[index + pools.length]
                                    : highchartsColors[index + pools.length - defaultColors.length];

                            await queryRunner.query(/* sql */ `
                                UPDATE "investment"
                                SET "visualization_color" = '${color}'
                                WHERE "id" = '${ima.investment_id}';
                            `);
                        }
                    })
                );
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the color column
        await queryRunner.query('ALTER TABLE "investment" DROP COLUMN "visualization_color";');

        // Remove default colors from tenant settings
        const [tenantSettings] = await queryRunner.query(
            'SELECT "app_setting" FROM "tenant" LIMIT 1;'
        );
        const { visualizationColors, ...rest } = tenantSettings.app_setting;
        await queryRunner.query(`UPDATE "tenant" SET "app_setting" = '${JSON.stringify(rest)}'`);
    }
}
