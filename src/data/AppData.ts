import {
  getIntForKey,
  getStringForKey,
  setIntForKey,
  setStringForKey
} from './LocalDataManager';

const LAST_ROOT_FOLDER = 'LAST_ROOT_FOLDER';
const DES_LAST_ROOT_FOLDER = 'DES_LAST_ROOT_FOLDER';
const LAST_CONVERT_KEY = 'LAST_CONVERT_KEY';

export const setLastRootFolder = (value: string) => {
  setStringForKey(LAST_ROOT_FOLDER, value);
};

export const getLastRootFolder = () => getStringForKey(LAST_ROOT_FOLDER, '');

export const setLastDestinationConvertFolder = (value: string) => {
  setStringForKey(DES_LAST_ROOT_FOLDER, value);
};

export const getLastDestinationConvertFolder = () =>
  getStringForKey(DES_LAST_ROOT_FOLDER, '');

export const setLastConvertType = (value: string) => {
  setStringForKey(LAST_CONVERT_KEY, value);
};

const LAST_ACTION_FILE = 'LAST_ACTION_FILE';
export const getLastActionFile = () => getStringForKey(LAST_ACTION_FILE, '');
export const setLastActionFile = (value: string) =>
  setStringForKey(LAST_ACTION_FILE, value);

const LAST_CONSTANTS_FILE = 'LAST_CONSTANTS_FILE';
export const getLastConstantsFile = () =>
  getStringForKey(LAST_CONSTANTS_FILE, '');
export const setLastConstantsFile = (value: string) =>
  setStringForKey(LAST_CONSTANTS_FILE, value);

const LAST_REDUCERS_FILE = 'LAST_REDUCERS_FILE';
export const getLastReducersFile = () =>
  getStringForKey(LAST_REDUCERS_FILE, '');
export const setLastReducersFile = (value: string) =>
  setStringForKey(LAST_REDUCERS_FILE, value);

export const getLastLogicFile = () => getStringForKey('LAST_Logic_FILE', '');
export const setLastLogicFile = (value: string) =>
  setStringForKey('LAST_Logic_FILE', value);

export const getLastSagaFile = () => getStringForKey('LAST_Saga_FILE', '');
export const setLastSagaFile = (value: string) =>
  setStringForKey('LAST_Saga_FILE', value);

export const getLastSelectorsFile = () =>
  getStringForKey('LAST_Selectors_FILE', '');
export const setLastSelectorsFile = (value: string) =>
  setStringForKey('LAST_Selectors_FILE', value);

export const getLastEngFile = () => getStringForKey('LAST_Eng_FILE', '');
export const setLastEngFile = (value: string) =>
  setStringForKey('LAST_Eng_FILE', value);

export const getLastViFile = () => getStringForKey('LAST_Vi_FILE', '');
export const setLastViFile = (value: string) =>
  setStringForKey('LAST_Vi_FILE', value);

export const getLastSceneScale = () => getIntForKey('LastSceneScale', 1)
export const setLastSceneScale = (value: number) => setIntForKey('LastSceneScale', value)

export const getLastSceneX = () => getIntForKey('LastSceneX', 100)
export const setLastSceneX = (value: number) => setIntForKey('LastSceneX', value)

export const getLastSceneY = () => getIntForKey('LastSceneY', 10)
export const setLastSceneY = (value: number) => setIntForKey('LastSceneY', value)