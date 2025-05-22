import { getOrCreateConnection } from '../../typeorm';

import { UpdateResult } from 'typeorm';
import dayjs from 'dayjs';

import { FundTransaction } from '../../models';
import { TransactionTypeValue } from '../../models/TransactionType';

(async function() {
    console.log('copying over dates into scheduledDate');

    const connection = await getOrCreateConnection();
    const repo = connection.manager.getRepository(FundTransaction);

    // take this opportunity to ensure value is midday
    function toMidday(date: Date): Date {
        return dayjs(date)
            .startOf('day')
            .add(12, 'hour')
            .toDate();
    }

    // non-historic grants with missing scheduledDate
    const missingScheduledDate = await repo
        .createQueryBuilder('ft')
        .leftJoinAndSelect('ft.transactionInfo', 'info')
        .leftJoin('ft.transactionType', 'type')
        .where('ft.scheduledDate IS NULL')
        .andWhere('ft.isHistoric != true')
        .andWhere('type.name = :grant', { grant: TransactionTypeValue.GRANT })
        .getMany();

    const needsManuallyAttention: string[] = [];
    const updates: Promise<UpdateResult>[] = [];
    missingScheduledDate.forEach(ft => {
        // one-time grants
        if (!ft.originalFundTransactionId) {
            const middayScheduleDate = toMidday(
                ft.transactionInfo?.requestedProcessDate ?? ft.createdOn
            );
            updates.push(
                repo.update(ft.id, {
                    scheduledDate: middayScheduleDate
                })
            );
        }
        // series
        else {
            // only copy over if value exists
            if (ft.transactionInfo?.requestedProcessDate) {
                updates.push(
                    repo.update(ft.id, {
                        scheduledDate: toMidday(ft.transactionInfo.requestedProcessDate)
                    })
                );
            } else {
                needsManuallyAttention.push(ft.transactionCode);
            }
        }
    });

    await Promise.all(updates);

    console.log(`successfully updated ${updates.length} grants.
    unable to update the follow:
    '${needsManuallyAttention.join("','")}'
    `);
})();
