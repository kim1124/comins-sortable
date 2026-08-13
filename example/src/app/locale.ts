export const playgroundLocaleKey = 'comins-sortable-playground-locale';

export type PlaygroundLocale = 'ko' | 'en';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readPlaygroundLocale(storage: StorageLike): PlaygroundLocale {
  return storage.getItem(playgroundLocaleKey) === 'en' ? 'en' : 'ko';
}

export function writePlaygroundLocale(
  storage: StorageLike,
  locale: PlaygroundLocale,
): void {
  storage.setItem(playgroundLocaleKey, locale);
}
