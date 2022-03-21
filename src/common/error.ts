// we only want to add handlers once
import { isNode } from './env';

class AppError {
  private constructorErr = new Error();

  constructor(private error: unknown) {}

  toStringMessage() {
    if (this.error instanceof Error) {
      return `${this.error.name} \n\n ${this.error.message}\n\n ${this.error.stack}`;
    }
    return `UnknownError: ${this.error}`;
  }
}

export type ErrorReporter = (err: AppError) => void;
let handlersInstalled = false;

export function installErrorHandler(reporter: ErrorReporter) {
  if (handlersInstalled) return;
  const handler = (err: unknown) => {
    const appErr = new AppError(err);
    reporter(appErr);
  };
  if (isNode()) {
    process.on('uncaughtException', handler);
    process.on('unhandledRejection', handler);
  } else {
    window.addEventListener('error', (it) => {
      handler(it.error);
    });
    window.addEventListener('unhandledrejection', handler);
  }
  handlersInstalled = true;
}
