import { importTransactions } from '../../cron/accounting/importTransactions';
import { dayjs } from '../../utilities/datetime';

export async function importRecentTransactions() {
    // Import previous 10 days of transactions
    const startDate = dayjs()
        .subtract(10, 'day')
        .toDate();
    const endDate = dayjs()
        .subtract(1, 'day')
        .toDate();

    await importTransactions(startDate, endDate);
}
