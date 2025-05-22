export const evaluateSpecialApprovalThreshold = (
    amount: number,
    specialApprovalThreshold: number
) => (amount > specialApprovalThreshold ? false : null);
