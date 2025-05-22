import { getOrCreateConnection } from '../../typeorm';

import { FundTransaction } from '../../models';

(async () => {
    const connection = await getOrCreateConnection();
    const fundTransactionRepo = connection.getRepository(FundTransaction);

    const series = await fundTransactionRepo
        .createQueryBuilder('series')
        .leftJoin('series.transactionStatus', 'status')
        .where("series.transactionCode LIKE 'GS-%'")
        .andWhere("status.name != 'CANCELED'")
        // instances has null dates
        .andWhere(qb => {
            const subQuery = qb
                .subQuery()
                .select('ft.originalFundTransactionId', 'series_id')
                .from(FundTransaction, 'ft')
                // instances of a series
                .andWhere("ft.transactionCode LIKE 'G-%'")
                .orWhere('ft.originalFundTransactionId IS NOT NULL')
                .getQuery();

            return 'series.id IN ' + subQuery;
        })
        .getMany();

    const updates = [];

    for await (const originalGrant of series) {
        const grants = await fundTransactionRepo.find({
            where: { originalFundTransactionId: originalGrant.id }
        });

        // check for duplicate recurrenceIds from within fellow grant instances

        for (let i = 0; i < grants.length; i++) {
            const grant = grants[i];

            if (grant.transactionRecurrenceId !== originalGrant.transactionRecurrenceId) {
                updates.push(
                    fundTransactionRepo
                        .createQueryBuilder()
                        .update()
                        .set({ transactionRecurrenceId: originalGrant.transactionRecurrenceId })
                        .where('id = :id', { id: grant.id })
                        .execute()
                );
            }
        } // end grant loop
    } // end series loop

    // update series with invalid recurrence ids
    await Promise.all(updates);

    console.log(`Updated a whopping ${updates.length} records`);
})();
