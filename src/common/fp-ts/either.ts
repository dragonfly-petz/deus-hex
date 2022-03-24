import { pipe } from 'fp-ts/function';
import { E, Either } from './fp';

export function throwFromEither<A>(either: Either<string, A>) {
  return pipe(
    either,
    E.getOrElseW((err) => {
      throw new Error(`Expected right but got left with message: ${err}`);
    })
  );
}