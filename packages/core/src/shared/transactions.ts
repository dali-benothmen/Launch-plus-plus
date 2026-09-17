export interface ReadContext {
  readonly transactionId: string;
}

export interface WriteContext extends ReadContext {
  readonly writable: true;
}

export interface TransactionManager {
  read<TResult>(work: (context: ReadContext) => TResult): TResult;
  write<TResult>(work: (context: WriteContext) => TResult): Promise<TResult>;
}
