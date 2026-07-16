export const NUMBER_NAMES_LIST = ['count', 'number', 'quantity', 'num', 'coin', 'gold'];

export const collidersCompList = ['BoxCollider', 'CircleCollider', 'PolygonCollider'];
const physicsCompList = ['PhysicsCollider', 'PhysicsBoxCollider', 'PhysicsCircleCollider', 'PhysicsPolygonCollider'];
export const noRenderList = [
  ...collidersCompList,
  ...physicsCompList,
  'RigidBody', 'Collider',
  'ExtraDataComp', 'TouchEventRegister', 'EventRegister',
];

export const renderList = [
  'ListView', 'ScrollView', 'Slider', 'RenderTexture', 'UILayout',
  'DragonBones', 'ProgressBar', 'Label', 'TextInput', 'Button',
  'Container', 'Sprite', 'Mask', 'Particle', 'Graphics', 'TiledMap',
  'RichText', 'SpineSkeleton', 'Scene', 'CircleProgress'
];
