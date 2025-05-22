import { EntityManager } from 'typeorm';

import { Fund } from '../models/Fund';
import { Investment, InvestmentType } from '../models/Investment';
import { Tenant } from '../models';

// See https://api.highcharts.com/highcharts/colors
export const highchartsFallbackColors = [
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

export const assignVisualizationColor = async (
    manager: EntityManager,
    fund: Fund | undefined,
    excludePoolCount?: boolean,
    customOffset?: number
): Promise<string> => {
    // Get the tenant-specific investment visualization colors
    const tenant = await manager.getRepository(Tenant).findOne();
    const colors = [...tenant.appSetting.visualizationColors, ...highchartsFallbackColors];

    const numberOfPools = await manager
        .getRepository(Investment)
        .createQueryBuilder('investment')
        .where('investment.investmentType = :investmentTypeName', {
            investmentTypeName: InvestmentType.POOL
        })
        .getCount();

    let numberOfUserIMAs = 0;
    if (fund) {
        // Get the userProfile for the owner of the fund
        const userProfileId = fund.createdBy;

        // Get all of the investments the userProfile's funds own to determine the next color
        const userFunds = await manager
            .getRepository(Fund)
            .createQueryBuilder('fund')
            .leftJoinAndSelect('fund.investments', 'investments')
            .leftJoinAndSelect('investments.investment', 'investment')
            .where('fund.createdByUserProfileId = :userProfileId', { userProfileId })
            .getMany();

        numberOfUserIMAs = userFunds.reduce((count: number, currentFund: Fund) => {
            let imaCount = 0;

            currentFund.investments.forEach(fundInvestment => {
                if (fundInvestment.investment.investmentType === InvestmentType.IMA) {
                    imaCount++;
                }
            });

            return count + imaCount;
        }, 0);
    }

    let index = numberOfUserIMAs + 1;
    if (!excludePoolCount) index += numberOfPools;
    if (customOffset) index += customOffset;

    // If the number of user investments hasn't exceeded the bounds of the color array, assign the next color in the list
    if (colors[index]) {
        return colors[index];
    } else {
        // Randomize the color
        return '#000000'.replace(/0/g, () => (~~(Math.random() * 16)).toString(16));
    }
};
