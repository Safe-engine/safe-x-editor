export const NUMBER_NAMES_LIST = ['count', 'number', 'quantity', 'num', 'coin', 'gold'];

export const collidersCompList = ['BoxCollider', 'CircleCollider', 'PolygonCollider'];
const physicsCompList = ['PhysicsCollider', 'PhysicsBoxCollider', 'PhysicsCircleCollider', 'PhysicsPolygonCollider'];
export const noRenderList = [
  ...collidersCompList,
  ...physicsCompList,
  'BlockInputEventsComp',
  'RigidBody', 'Collider',
  'ExtraDataComp', 'TouchEventRegister', 'EventRegister',
  'LabelShadowComp', 'LabelOutlineComp'
];

export const renderList = [
  'ListView', 'ScrollView', 'Slider', 'RenderTexture',
  'DragonBones', 'ProgressBar', 'Label', 'TextInput',
  'Container', 'Sprite', 'Mask', 'Particle', 'Graphics', 'TiledMap',
  'RichText', 'SpineSkeleton', 'Scene',
  'ButtonComp', 'ListViewComp', 'ScrollViewComp', 'SliderComp', 'RenderTextureComp',
  'DragonBonesComp', 'ProgressTimerComp', 'LabelComp', 'InputComp',
  'NodeRender', 'SpriteRender', 'MaskRender', 'ParticleComp', 'GraphicsRender', 'TiledMapComp',
  'RichTextComp', 'SpineSkeleton', 'SceneComponent'
];
