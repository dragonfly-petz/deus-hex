import { partialCall } from './function';
import { DF } from './df';

const logLevels = ['info', 'status', 'warn', 'error'] as const;
export type LogLevel = (typeof logLevels)[number];

export interface Log {
  level: LogLevel;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  args: Array<any>;

  source: string;
}

export type LogHandler = (log: Log) => void;
type LogFn = typeof console.log;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const voidLogFn: LogFn = () => {};

export class Logger {
  private loggers = new Set<LogHandler>([consoleLogHandler]);

  public readonly log = voidLogFn;

  public readonly info = voidLogFn;

  public readonly status = voidLogFn;

  public readonly warn = voidLogFn;

  public readonly error = voidLogFn;

  constructor(private source: string) {
    for (const name of ['log', ...logLevels] as const) {
      this[name] = partialCall(this.doLog, name === 'log' ? 'info' : name);
    }
  }

  addHandler(handler: LogHandler) {
    this.loggers.add(handler);
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  private doLog = (level: LogLevel, ...args: Array<any>) => {
    const log: Log = { level, args, source: this.source };
    for (const logger of this.loggers) {
      logger(log);
    }
  };
}

const originalConsole = console;
export const consoleLogHandler: LogHandler = async (log) => {
  const consoleLogFn = log.level === 'status' ? 'info' : log.level;
  const now = new Date();
  const scopePrefix = `**${log.source}** > `;
  const time = DF.format(now, "yyyy-MM-dd'T'HH:mm:ss.SSSX");
  const message = `${scopePrefix}[${log.level}] [${time}]`;
  originalConsole[consoleLogFn].apply(originalConsole, [message, ...log.args]);
};

export function getOriginalConsole() {
  return originalConsole;
}

export declare const globalLogger: Logger;

export function initGlobalLogger(source: string) {
  // @ts-ignore
  // noinspection JSConstantReassignment
  globalLogger = new Logger(source);
}
