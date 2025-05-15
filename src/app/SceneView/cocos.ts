export function onStart() {
  cc.view.setDesignResolutionSize(640, 1320, cc.ResolutionPolicy.FIXED_WIDTH)
  cc.director.runScene(new cc.Scene())
}