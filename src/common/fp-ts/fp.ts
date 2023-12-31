import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import * as A from 'fp-ts/lib/Array';

export type Either<L, R> = E.Either<L, R>;
export { E };

export type Option<At> = O.Option<At>;
export { O };
export { A };
