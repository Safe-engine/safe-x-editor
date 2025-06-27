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

export const renderComMapCpp = {
  'cc.Sprite': 'SpriteRender',
  'cc.Graphics': 'Graphics',
  'cc.Label': 'LabelComp',
  'cc.RichText': 'RichTextComp',
  'cc.Button': 'ButtonComp',
  'cc.TiledMap': 'TiledMapComp',
  'cc.Event': 'ComponentEvent',
  'cc.Prefab': 'string',
  'cc.SpriteFrame': 'string',
  'cc.ParticleAsset': 'string',
  'cc.Node': 'NodeComp',
  'cc.NodePool': 'NodePool*',
  'cc.ProgressBar': 'ProgressBarComp',
  'cc.ScrollView': 'ScrollViewComp',
  'cc.Mask': 'MaskRender',
  'cc.Vec2': 'Vec2',
  'cc.Vec3': 'Vec2',
  'cc.Rect': 'Rect',
  'cc.Size': 'Size',
  'cc.Camera': 'CameraComp',
  'cc.Animation': 'AnimationComp',
  'cc.JsonAsset': 'JsonAssetComponent*',
  'cc.BoxCollider': 'BoxCollider',
  'cc.CircleCollider': 'CircleCollider',
  'cc.PolygonCollider': 'PolygonCollider',
  'cc.Collider': 'Collider',
  'cc.PhysicsContact': 'PhysicsContact*',
  'cc.PhysicsCollider': 'PhysicsCollider',
  'cc.PhysicsBoxCollider': 'PhysicsBoxCollider',
  'cc.PhysicsCircleCollider': 'PhysicsCircleCollider',
  'cc.PhysicsPolygonCollider': 'PhysicsPolygonCollider',
  'cc.RigidBody': 'RigidBody',
  'sp.SkeletonData': 'SkeletonData',
  'sp.Skeleton': 'SpineSkeleton',
  'dragonBones.Armature': 'DragonBonesArmature',
};

export const IS_DEV = process.env.IS_DEV;

export const ignoreCompsList = ['AudioController', 'BulletManager', 'AdsManager'];

export const DEBUG_CLASS_CONTENT = 'class Laser extends';
