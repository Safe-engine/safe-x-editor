export const namesMap = {
  cc: 'cocos2d',
  ccs: 'CSLoader',
  ccui: 'ui',
  Class: 'Ref'
};

export const typesMap = {
  Float: 'float',
  Integer: 'int',
  String: 'string',
  string: 'string',
  boolean: 'bool',
  Boolean: 'bool',
  TouchEventData: 'TouchEventData*',
  PhysicsContact: 'PhysicsContact*',
  LevelDataJsonAsset: 'LevelDataJsonAsset*',
};

export const listNameSpace = [
  'cc', 'ccs', 'ccui', 'BulletManager'
];

export const parseOption = {
  ranges: false,
  errorRecovery: true,
  plugins: ['jsx', 'typescript']
};

export const INCLUDE_CPP_INDEX = 34;

export const IS_DEV = process.env.IS_DEV;

export const ignoreCompsList = ['AudioController', 'BulletManager', 'AdsManager'];

export const DEBUG_CLASS_CONTENT = 'class Laser extends';
