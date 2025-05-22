export class NotCoverDivestmentError extends Error {
  constructor(message) {
      super(message);
      this.name = 'NotCoverDivestmentError';
      this.stack = new Error().stack;
  }
}
