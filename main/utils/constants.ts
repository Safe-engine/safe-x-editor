export const NUMBER_NAMES_LIST = ['count', 'number', 'quantity', 'num', 'coin', 'gold'];

export const collidersCompList = ['BoxCollider', 'CircleCollider', 'PolygonCollider'];
const physicsCompList = ['PhysicsCollider', 'PhysicsBoxCollider', 'PhysicsCircleCollider', 'PhysicsPolygonCollider'];
export const noRenderList = [
  ...collidersCompList,
  ...physicsCompList,
  'BlockInputEventsComp',
  'RigidBody', 'Collider',
  'ExtraDataComp', 'TouchEventRegister', 'EventRegister',
  'LabelShadowComp', 'LabelOutlineComp', 'SpineBonesControlComponent'
];

export const renderList = [
  'ButtonComp', 'ListViewComp', 'ScrollViewComp', 'SliderComp', 'RenderTextureComp',
  'DragonBonesComp', 'ProgressTimerComp', 'LabelComp', 'InputComp',
  'NodeRender', 'SpriteRender', 'MaskRender', 'ParticleComp', 'GraphicsRender', 'TiledMapComp',
  'RichTextComp', 'SpineSkeleton', 'SceneComponent'
];
