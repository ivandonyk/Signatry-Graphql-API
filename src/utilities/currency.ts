import _currency from 'currency.js';

// Utility functions to do math with correct floating-point arithmetic, and return Number
export const currency = {
    add: (amount1: number, amount2: number, precision = 2): number => {
        return _currency(amount1, { precision: precision }).add(amount2).value;
    },

    subtract: (amount1: number, amount2: number, precision = 2): number => {
        return _currency(amount1, { precision: precision }).subtract(amount2).value;
    },

    divide: (amount1: number, amount2: number, precision = 2): number => {
        return _currency(amount1, { precision: precision }).divide(amount2).value;
    },

    multiply: (amount1: number, amount2: number, precision = 2): number => {
        return _currency(amount1, { precision: precision }).multiply(amount2).value;
    },

    toCurrency: (amount: number): number => {
        return _currency(amount).value;
    },

    parseString: (amount: string): number => {
        return _currency(amount).value;
    }
};

export function stringIsCurrency(search: string): boolean {
    const $decimalRegex = /^\$?\-?([1-9]{1}[0-9]{0,2}(\,\d{3})*(\.\d{0,2})?|[1-9]{1}\d{0,}(\.\d{0,2})?|0(\.\d{0,2})?|(\.\d{1,2}))$|^\-?\$?([1-9]{1}\d{0,2}(\,\d{3})*(\.\d{0,2})?|[1-9]{1}\d{0,}(\.\d{0,2})?|0(\.\d{0,2})?|(\.\d{1,2}))$|^\(\$?([1-9]{1}\d{0,2}(\,\d{3})*(\.\d{0,2})?|[1-9]{1}\d{0,}(\.\d{0,2})?|0(\.\d{0,2})?|(\.\d{1,2}))\)$/;
    return $decimalRegex.test(search);
}

export function numberFromCurrencyString(currencyString: string): number {
    return _currency(currencyString).value;
}
