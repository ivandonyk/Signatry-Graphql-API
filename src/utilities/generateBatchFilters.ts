import { FundTransactionDetail } from '../models';
import { SelectQueryBuilder } from 'typeorm';
import { TransactionDetailCustomFilter } from '../inputs/FundTransactionDetail/FundTransactionDetailCustomFilter';

export const generateBatchFilters = (
    transactionsQuery?: SelectQueryBuilder<FundTransactionDetail>,
    filters?: TransactionDetailCustomFilter
) => {
    if (!filters) return transactionsQuery;

    // add filters
    if (filters.destination && filters.destination.length) {
        transactionsQuery.andWhere('entity.destinationAccount.id in (:...destinationIds)', {
            destinationIds: filters.destination
        });
    }

    if (filters.source && filters.source.length) {
        transactionsQuery.andWhere('entity.sourceAccount.id in (:...sourceIds)', {
            sourceIds: filters.source
        });
    }

    if (filters.type && filters.type.length) {
        transactionsQuery.andWhere('transactionDetailType.name in (:...typeIds)', {
            typeIds: filters.type
        });
    }

    if (filters.fund && filters.fund.length) {
        transactionsQuery.andWhere('fundInvestment.fundId in (:...fundIds)', {
            fundIds: filters.fund
        });
    }

    if (filters.donor && filters.donor.length) {
        transactionsQuery.innerJoin('fundInvestment.fund', 'fund');
        transactionsQuery.innerJoin('fund.createdByUserProfile', 'createdByUserProfile');
        transactionsQuery.andWhere('createdByUserProfile.id in (:...donorIds)', {
            donorIds: filters.donor
        });
    }

    return transactionsQuery;
};
