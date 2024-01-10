export class GlobalData {
  static isDebugParser = false;
  static assetsInfo: any = {};
  static clickEventHandlers = [];
  static customComponents: string[] = [];
  static currentClassName: string = '';
  static cbMethodParamsMap: any = {};
  static objectTypeMap: any = {};
  static customNoRenderComponents: string[] = [];
  static jsonAssetsMap: { [key: string]: string } = {}
  static cbParamsMap: { [key: string]: number } = {
    onCollisionEnter: 2,
    onCollisionExit: 2,
    onCollisionStay: 2,
    onTouchMove: 2,
    onTouchStart: 2,
    onTouchEnd: 2,
    onTouchCancel: 2,
  }
  static templatesMap: { [key: string]: string } = {
    SpineSkeleton: '{{data}}, {{atlas}}',
    Collider: '{{group}}, {{offset}}',
    BoxCollider: '{{width}}, {{height}}',
    LabelComp: '{{string}}, {{fontName}}, {{size}}',
    SpriteRender: '{{spriteFrame}}',
    ProgressTimerComp: '{{spriteFrame}}, {{fillType}}, {{fillRange}}, {{fillCenter}}, {{isReverse}}',
    ExtraDataComp: '{{key}}, {{value}}',
    ScrollViewComp: '{{viewSize}}, {{contentSize}}, {{bounceEnabled}}',
    ParticleComp: '{{plistFile}}',
  };
  static defaultPropsMap: { [key: string]: any } = {
    SpineSkeleton: { loop: true, atlas: '""' },
    Collider: { offset: 'Vec2(0, 0)', group: 0 },
    BoxCollider: { height: 0, width: 0 },
    LabelComp: { string: '""', fontName: 'FontAssets::defaultFont', size: 48 },
    ProgressTimerComp: { fillType: 'FillType::HORIZONTAL', fillRange: 1, fillCenter: 'Vec2(0, 0)', isReverse: false },
    ScrollViewComp: { bounceEnabled: true },
  };
  static hasStartMap: { [key: string]: boolean } = {};
}

let assetsList = {};
export const customCompList = {};

export function getAssets() {
  return Object.values(assetsList);
}

export function pushAssets(uuid, item) {
  return assetsList[uuid] = item;
}

export function resetAssets() {
  return assetsList = {};
}
