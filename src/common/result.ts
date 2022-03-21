import { Either } from 'fp-ts/Either';

export type Result<A> = Either<string, A>;
