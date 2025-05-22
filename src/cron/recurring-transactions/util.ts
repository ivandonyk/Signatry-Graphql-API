import dayjs from 'dayjs';
import { EntityManager } from 'typeorm';

import { FundTransaction, TransactionRecurrenceJobDate } from '../../models';
import { TransactionTypeValue } from '../../models/TransactionType';
import { getOrCreateConnection } from '../../typeorm';

export async function getScheduledFundTransactions(

    manager: EntityManager,
    type: TransactionTypeValue,
    scheduleDate?: string,
    onlyScheduled?: boolean
) {
    const query = manager
        .getRepository(FundTransaction)
        .createQueryBuilder('ft')
        .leftJoin('ft.transactionType', 'transactionType')
        .leftJoinAndSelect('ft.transactionStatus', 'transactionStatus')
        .where("date_trunc('day', ft.scheduledDate) = :scheduleDate", {
            // either the input or today
            scheduleDate: dayjs(scheduleDate).format('YYYY-MM-DD')
        })
        .andWhere('transactionType.name = :type', { type });

    if (!!onlyScheduled) {
        query.andWhere('transactionStatus.name = :name', { name: 'SCHEDULED' });
    }

    return query.getMany();
}

export async function updateTransactionRecurrenceJobDate() {
    const connection = await getOrCreateConnection();

    await connection.manager.update(TransactionRecurrenceJobDate, 1, {
        // today at noon
        date: dayjs()
            .startOf('day')
            .add(12, 'hour')
            .toDate()
    });
}
