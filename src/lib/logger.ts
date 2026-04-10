/**
 * 本番（Vercel）では console.log / info / warn を出さない。
 * 検証したいときは .env に NEXT_PUBLIC_VERBOSE_LOGS=true を設定。
 */
const isDev = process.env.NODE_ENV === 'development';
const verbose = process.env.NEXT_PUBLIC_VERBOSE_LOGS === 'true';

const allowDev = () => isDev || verbose;

export const logger = {
  log: (...args: unknown[]) => {
    if (allowDev()) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (allowDev()) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (allowDev()) console.warn(...args);
  },
  /** 失敗時の追跡用。本番の Vercel / ブラウザにも残す */
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
