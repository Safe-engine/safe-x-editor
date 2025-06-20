const GAME_NAME = 'safex-editor';
const getKeyForGame = (key: string) => `${GAME_NAME}_${key}`;

export const getStringForKey = (key: string, defaultValue?: string): string => {
  const value = localStorage.getItem(getKeyForGame(key));
  if (!value) { return defaultValue || ''; }
  return (value);
};

export const setStringForKey = (key: string, value: string) => {
  localStorage.setItem(getKeyForGame(key), (value));
};

export const getIntForKey = (key: string, defaultValue: number): number => {
  const value = getStringForKey(key);
  if (!value) { return defaultValue; }
  return parseInt(value, 10);
};

export const setIntForKey = (key: string, value: number) => {
  setStringForKey(key, `${value}`);
};

export const getFloatForKey = (key: string, defaultValue: number): number => {
  const value = getStringForKey(key);
  if (!value) { return defaultValue; }
  return parseFloat(value);
};

export const setFloatForKey = (key: string, value: number) => {
  setStringForKey(key, `${value}`);
};

export const getObjectForKey = (key: string, defaultValue?: object) => {
  const value = getStringForKey(key);
  if (!value) { return defaultValue || {}; }
  return JSON.parse(value);
};

export const setObjectForKey = (key: string, value: object) => {
  setStringForKey(key, JSON.stringify(value));
};

export const getBoolForKey = (key: string, defaultValue: boolean): boolean => {
  const value = getStringForKey(key);
  if (!value) { return defaultValue; }
  return value === 'true';
};

export const setBoolForKey = (key: string, value: boolean) => {
  setStringForKey(key, value.toString());
};
