export const NUMBER_NAMES_LIST = ['count', 'number', 'quantity', 'num', 'coin', 'gold'];

export const collidersCompList = ['BoxCollider', 'CircleCollider', 'PolygonCollider']
const physicsCompList = ['PhysicsCollider', 'PhysicsBoxCollider', 'PhysicsCircleCollider', 'PhysicsPolygonCollider']
export const noRenderList = [
  ...collidersCompList,
  ...physicsCompList,
  'BlockInputEventsComp',
  'ButtonComp', 'RigidBody', 'Collider',
  'ExtraDataComp', 'TouchEventRegister', 'EventRegister',
  'LabelShadowComp', 'LabelOutlineComp'
];

export const renderList = [
  'DragonBonesComp', 'ProgressTimerComp', 'LabelComp', 'ScrollViewComp', 'InputComp',
  'NodeRender', 'SpriteRender', 'MaskRender', 'ParticleComp', 'GraphicsRender', 'TiledMap',
  'RichTextComp', 'SpineSkeleton', 'SceneComponent'
]