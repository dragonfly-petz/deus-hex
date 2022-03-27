// we only want to add handlers once
import { Either } from 'fp-ts/Either';
import { isNode } from './env';
import { isObjectWithKey } from './type-assertion';
import { E } from './fp-ts/fp';
import type { FlashMessageProps } from '../renderer/framework/FlashMessage';

class AppErrorBase {
  private constructorErr = new Error();

  protected label = 'AppErrorBase';

  constructor(private error: unknown) {}

  toStringMessage() {
    if (this.error instanceof Error) {
      return `${this.error.name} \n\n ${this.error.message}\n\n ${this.error.stack}`;
    }
    return `${this.label}: ${this.error}`;
  }
}

class UnhandledError extends AppErrorBase {
  protected label = 'UnhandledError';
}

class UnhandledRejection extends AppErrorBase {
  protected label = 'UnhandledRejection';
}

class AppErrorUnknown extends AppErrorBase {
  protected label = 'AppErrorUnknown';
}

type AppError = UnhandledError | UnhandledRejection | AppErrorUnknown;

export type ErrorHandler = (err: AppError) => void;
export type CaughtErrorHandler = (err: string) => void;

export class ErrorReporter {
  constructor(
    private uncaughtHandler: ErrorHandler,
    private caughtHandler: CaughtErrorHandler,
    private fmHandler: (fm: FlashMessageProps) => void
  ) {}

  addFm(fm: FlashMessageProps) {
    this.fmHandler(fm);
  }

  async withFlashMessage<A>(prom: Promise<Either<string, A>>) {
    const res = await prom;
    if (E.isLeft(res)) {
      this.addFm({
        kind: 'error',
        message: res.left,
        title: 'Failure',
      });
    } else {
      this.addFm({
        kind: 'success',
        title: 'Success',
        message: 'Succeeded',
      });
    }
    return res;
  }

  handleUncaught(err: AppError) {
    this.uncaughtHandler(err);
  }

  handleCaught(err: unknown) {
    const asAppErr =
      err instanceof AppErrorBase ? err : new AppErrorUnknown(err);
    this.caughtHandler(asAppErr.toStringMessage());
  }

  async caughtErrorToEither<A>(
    prom: Promise<CaughtErrorOrResult<A>>
  ): Promise<Either<string, A>> {
    const val = await prom;
    if (isCaughtError(val)) {
      this.caughtHandler(val.err);
      return E.left('Error');
    }
    return E.right(val);
  }

  caughtErrorToEitherJoin<A>(
    val: CaughtErrorOrResult<Either<string, A> | A>
  ): Either<string, A> {
    if (isCaughtError(val)) {
      this.caughtHandler(val.err);
      return E.left(`Caught error: ${val.err.substring(0, 30)}`);
    }
    if (isObjectWithKey(val, '_tag')) {
      return val;
    }
    return E.right(val);
  }
}

const caughtErrConst = 'caughtError_24fas3244' as const;

export interface CaughtError {
  _caughtError: typeof caughtErrConst;
  err: string;
}

function caughtError(err: string): CaughtError {
  return {
    _caughtError: 'caughtError_24fas3244',
    err,
  };
}

export function isCaughtError<A>(
  val: CaughtErrorOrResult<A>
): val is CaughtError {
  return (
    isObjectWithKey(val, '_caughtError') && val._caughtError === caughtErrConst
  );
}

export type CaughtErrorOrResult<A> = CaughtError | A;

export function tryCatch<A>(block: () => A): CaughtErrorOrResult<A> {
  try {
    return block();
  } catch (e) {
    const err = new AppErrorUnknown(e);
    return caughtError(err.toStringMessage());
  }
}

export async function tryCatchAsync<A>(
  block: () => Promise<A>
): Promise<CaughtErrorOrResult<A>> {
  try {
    return await block();
  } catch (e) {
    const err = new AppErrorUnknown(e);
    return caughtError(err.toStringMessage());
  }
}

let handlersInstalled = false;

export declare const globalErrorReporter: ErrorReporter;
export declare const ger: ErrorReporter;

export function initGlobalErrorReporter(
  uncaughtErrorHandler: ErrorHandler,
  caughtErrorHandler: CaughtErrorHandler,
  fmHandler: (fm: FlashMessageProps) => void
) {
  if (handlersInstalled) return;
  const reporter = new ErrorReporter(
    uncaughtErrorHandler,
    caughtErrorHandler,
    fmHandler
  );
  // @ts-ignore
  // noinspection JSConstantReassignment
  globalErrorReporter = reporter;
  // @ts-ignore
  // noinspection JSConstantReassignment
  ger = reporter;
  const handlerErr = (err: unknown) => {
    const appErr = new UnhandledError(err);
    reporter.handleUncaught(appErr);
  };
  const handlerRej = (err: unknown) => {
    const appErr = new UnhandledRejection(err);
    reporter.handleUncaught(appErr);
  };

  if (isNode()) {
    // don't handle exception in main
    // process.on('uncaughtException', handler);
    process.on('unhandledRejection', handlerRej);
  } else {
    window.addEventListener('error', (it) => {
      handlerErr(it.error);
    });
    window.addEventListener('unhandledrejection', handlerRej);
  }
  handlersInstalled = true;
}
