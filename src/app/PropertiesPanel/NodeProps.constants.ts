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

export const WIDGET_DIRECTIONS = [
  { key: 'top', label: 'Top', className: 'col-span-3 row-start-1 w-32 justify-self-center', horizontal: true },
  { key: 'left', label: 'Left', className: 'col-start-1 row-start-2' },
  { key: 'right', label: 'Right', className: 'col-start-3 row-start-2' },
  { key: 'bottom', label: 'Bottom', className: 'col-span-3 row-start-3 w-32 justify-self-center', horizontal: true },
];
