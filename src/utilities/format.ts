/**
 * Format currency value with commas for thousands and 2 decimal places
 * @param value
 */
export function formatCurrency(value: number) {
    let result = value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    if (result === '-0.00') result = '0.00';

    return result;
}

export const capitalizationFormatter = (value: string, exemptValues: string[] = []) => {
    if (exemptValues.includes(value)) {
        return value;
    }
    let returnVal = value;
    if (value.length > 1) {
        returnVal = value[0].toUpperCase() + value.slice(1).toLowerCase();
    }
    return returnVal;
};

export const statusFormatter = (value: string) => {
    const exemptWords = ['to', 'for', 'in'];
    const lowerVal = value.toLowerCase();
    const valArray = lowerVal.split('_');
    const capArray = valArray.map(val => capitalizationFormatter(val, exemptWords));
    const returnString = capArray.join(' ');
    return returnString;
};
