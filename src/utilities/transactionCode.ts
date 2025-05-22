const transactionCodeRegex = /([a-zA-Z]+)-(\d+)+/;

export function isTCode(testString: string): boolean {
    return transactionCodeRegex.test(testString);
}
