import {
  setStringForKey,
  getStringForKey,
  getBoolForKey,
  setBoolForKey,
  getObjectForKey,
  setObjectForKey,
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

export const getIsNextProject = () => getBoolForKey('IsNextProject', true);
export const setIsNextProject = (value: boolean) =>
  setBoolForKey('IsNextProject', value);

export const getIsAutoSaveGenComp = () =>
  getBoolForKey('IsAutoSaveGenComp', false);
export const setIsAutoSaveGenComp = (value: boolean) =>
  setBoolForKey('IsAutoSaveGenComp', value);

export const getIsAutoSaveGenPropTypes = () =>
  getBoolForKey('IsAutoSaveGenPropTypes', false);
export const setIsAutoSaveGenPropTypes = (value: boolean) =>
  setBoolForKey('IsAutoSaveGenPropTypes', value);

export const getIsAddDivText = () => getBoolForKey('IsAddDivText', true);
export const setIsAddDivText = (value: boolean) =>
  setBoolForKey('IsAddDivText', value);

export const getLibraryComponents = () =>
  getObjectForKey('LibraryComponents', [
    { isSubModule: true, name: 'BuyButton', from: 'src/base/Buttons' },
    { isSubModule: true, name: 'CancelButton', from: 'src/base/Buttons' },
    { isSubModule: true, name: 'DarkInput', from: 'src/base/Inputs' },
    { isSubModule: true, name: 'LightInput', from: 'src/base/Inputs' },
  ]);
export const setLibraryComponents = (value: object) =>
  setObjectForKey('LibraryComponents', value);
