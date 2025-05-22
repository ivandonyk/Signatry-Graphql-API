import { getOrCreateConnection } from '../../typeorm';

import dayjs from 'dayjs';
import _ from 'lodash';
import { Holding } from '../../models';

(async () => {
    const connection = await getOrCreateConnection({ logging: false });
    const repo = connection.getRepository(Holding);

    // create a Set of holding.id
    const deleteIdSet: Set<string> = new Set();

    // fetch all distinct holdings by holdingId
    const holdings = await repo
        .createQueryBuilder('holding')
        .distinctOn(['holding.holdingId'])
        .getMany();

    for await (const holding of holdings) {
        // return early if we already have id
        if (deleteIdSet.has(holding.id)) return;

        // find all possible duplicate records (same holdingId)
        const possibleDuplicates = await repo.find({ where: { holdingId: holding.holdingId } });

        if (possibleDuplicates.length > 1) {
            const groupedByDate = _.groupBy(
                // we only want the date (not time)
                possibleDuplicates.map(h => ({
                    id: h.id,
                    date: dayjs(h.date).format('YYYY-MM-DD')
                })),
                // key by `date` field
                'date'
            );

            // check for dates with more than one record on them
            _.forEach(groupedByDate, groupedHoldings => {
                if (groupedHoldings.length > 1) {
                    groupedHoldings.slice(1).map(v => deleteIdSet.add(v.id));
                }
            });
        }
    }

    // create JS array
    const deleteIds = [...deleteIdSet];

    if (deleteIds.length) {
        console.log(`deleting ${deleteIds.length} holdings`);

        await connection
            .createQueryBuilder()
            .delete()
            .from(Holding)
            .where('holding.id IN (:...ids)', { ids: deleteIds })
            .execute();
    }

    process.exit(0);
})();
