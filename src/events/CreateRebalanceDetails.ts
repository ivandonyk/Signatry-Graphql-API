import { getOrCreateConnection } from '../typeorm';
import {
    FundTransaction,
    FundTransactionDetail,
    TransactionDetailStatus,
    TransactionDetailType
} from '../models';
import { ProposedDetailsMeta } from '../models/FundTransactionMetadata';
import { InvestmentInput } from '../inputs/Investment/InvestmentInput';
import { getFundHoldingsBreakdownSansCash } from '../utilities/fundHoldingsBreakdown';
import { accountingUtil } from '../utilities/accounting';
import { currency } from '../utilities/currency';
import { TransactionDetailStatusValue } from '..//models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';

export async function CreateRebalanceDetails(
    transactionId: string,
    fundId: string,
    instructions: InvestmentInput[]
) {
    const connection = await getOrCreateConnection();
    const transRepo = connection.getRepository(FundTransaction);
    const detailRepo = connection.getRepository(FundTransactionDetail);
    const detailTypeRepo = connection.getRepository(TransactionDetailType);
    const detailStatusRepo = connection.getRepository(TransactionDetailStatus);
    const manager = connection.manager;

    async function saveTransactionDetails(
        proposedDetails: ProposedDetailsMeta[]
    ): Promise<FundTransactionDetail[]> {
        const transDeets = proposedDetails.map(proposedDetail => {
            return manager.create(FundTransactionDetail, {
                ...proposedDetail
            });
        });
        return detailRepo.save(transDeets);
    }

    const [
        transaction,
        glAccountsByInvestment,
        detailPendingStatus,
        detailType,
        breakdown
    ] = await Promise.all([
        transRepo.findOne(transactionId, {
            relations: ['fund', 'fund.investments', 'fund.investments.investment']
        }),
        accountingUtil.getGLAccountsByInvestment(manager),
        detailStatusRepo.findOne({
            name: TransactionDetailStatusValue.PENDING
        }),
        detailTypeRepo.findOne({
            name: TransactionDetailTypeName.TRANSFER
        }),
        getFundHoldingsBreakdownSansCash(fundId, manager)
    ]);

    let surpluses = [];
    let deficients = [];

    instructions.forEach(instruction => {
        const holding = breakdown.fundHoldings.find(
            fh => instruction.investmentId === fh.investmentId
        );

        const targetValue = currency.multiply(
            instruction.percentage,
            breakdown.totalInvestedBalance,
            10
        );

        const actualValue = holding?.marketValue ?? 0;

        const mergedVal = {
            investmentId: instruction.investmentId,
            targetValue,
            actualValue,
            discrepency: currency.subtract(actualValue, targetValue)
        };

        if (mergedVal.discrepency > 0) surpluses.push(mergedVal);
        else if (mergedVal.discrepency < 0) deficients.push(mergedVal);
    });

    // this might be useless...
    surpluses = surpluses.sort((a, b) => b.discrepency - a.discrepency);
    deficients = deficients.sort((a, b) => a.discrepency - b.discrepency);

    const rebalancedDetails = [];

    surpluses.forEach(val => {
        while (val.discrepency > 0) {
            const def = deficients.find(def => def.discrepency < 0);

            if (!def) break;

            const valDiscrepency = val.discrepency;
            const defDiscrepency = def.discrepency;

            const difference = currency.add(valDiscrepency, defDiscrepency, 10);

            const sourceAccount = glAccountsByInvestment[val.investmentId];
            const destinationAccount = glAccountsByInvestment[def.investmentId];

            rebalancedDetails.push({
                transactionDetailStatusId: detailPendingStatus.id,
                transactionDetailTypeId: detailType.id,
                fundInvestmentId: transaction.fund.investments.find(
                    inv => inv.investment.id === val.investmentId
                ),
                fundTransactionId: transactionId,
                sourceAccountId: sourceAccount.id,
                destinationAccountId: destinationAccount.id,
                amount: difference >= 0 ? Math.abs(defDiscrepency) : valDiscrepency,
                resolvedDateTime: new Date(),
                createdBy: transaction.userProfileId
            });

            val.discrepency = difference >= 0 ? difference : 0;
            def.discrepency = difference <= 0 ? difference : 0;
        }
    });

    return await saveTransactionDetails(rebalancedDetails);
}
