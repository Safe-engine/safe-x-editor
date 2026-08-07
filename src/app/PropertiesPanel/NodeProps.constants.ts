export const LABEL_DEFAULT_PROPS = {
  string: '',
  font: 'defaultFont',
  size: 36,
  outline: '{[, 0]}',
  shadow: '{[, 0, Size(0, 0)]}',
};

export const SPINE_DEFAULT_PROPS = {
  skin: '',
  animation: '',
  timeScale: 1,
  loop: true,
};

export const UI_LAYOUT_DEFAULT_PROPS = {
  direction: 'horizontal',
  gap: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
};

export const UI_LAYOUT_DIRECTIONS = ['none', 'horizontal', 'vertical', 'grid'];

export const PARTICLE_DEFAULT_PROPS = {
  configFile: '',
  spriteFrame: '',
  additive: false,
  count: 16,
  duration: 0.55,
  speed: 150,
  gravity: 260,
  radius: 7,
  width: 0,
  height: 0,
  angle: 0,
  angleSpread: 360,
  rotation: 0,
  rotationFollowVelocity: false,
  colors: [
    { r: 255, g: 222, b: 89 },
    { r: 255, g: 143, b: 86 },
    { r: 116, g: 219, b: 255 },
  ],
  emitOnTouch: false,
};

export const WIDGET_DIRECTIONS = [
  { key: 'top', label: 'Top', className: 'col-span-3 row-start-1 w-32 justify-self-center', horizontal: true },
  { key: 'left', label: 'Left', className: 'col-start-1 row-start-2' },
  { key: 'right', label: 'Right', className: 'col-start-3 row-start-2' },
  { key: 'bottom', label: 'Bottom', className: 'col-span-3 row-start-3 w-32 justify-self-center', horizontal: true },
];
