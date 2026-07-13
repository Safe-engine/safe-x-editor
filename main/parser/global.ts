export class GlobalData {
  static rootProject = '';
  static isDebugParser = false;
  static assetsInfo: any = {};
  static clickEventHandlers = [];
  static customComponents: string[] = [];
  static currentClassName: string = '';
  static cbMethodParamsMap: any = {};
  static objectTypeMap: any = {};
  static customHasRenderComponents: string[] = [];
  static customNoRenderComponents: string[] = [];
  static spineAnimations: { [key: string]: any } = {};
  static designedResolution?: { width: number; height: number };
  static staticPropsMap: { [key: string]: any } = {};
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
  static componentsMap: { [key: string]: any } = {
    SpineSkeleton: { loop: true, atlas: '""' },
    Collider: { offset: 'Vec2(0, 0)', group: 0 },
    BoxCollider: { height: 0, width: 0 },
    LabelComp: { string: '""', fontName: 'FontAssets::defaultFont', size: 48 },
    ProgressTimerComp: { fillType: 'FillType::HORIZONTAL', fillRange: 1, fillCenter: 'Vec2(0, 0)', isReverse: false },
    ScrollViewComp: { bounceEnabled: true },
  };
  static importPaths: any = {};
  static componentsCache: { [key: string]: any } = {};
}
