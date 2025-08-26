import * as spine from '@esotericsoftware/spine-core'
import { AtlasAttachmentLoader, SkeletonJson, TextureAtlas } from '@esotericsoftware/spine-core'

import { _atlasLoader } from './CCSkeletonAnimation'
import { CanvasRenderCmd } from './CCSkeletonCanvasRenderCmd'
import { WebGLRenderCmd } from './CCSkeletonWebGLRenderCmd'
/****************************************************************************
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2014 Chukong Technologies Inc.
 Copyright (c) 2014 Shengxiang Chen (Nero Chan)

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

/**
 * The main namespace of Spine, all classes, functions, properties and constants of Spine are defined in this namespace
 * @namespace
 * @name
 */
/**
 * <p>
 *     The skeleton of Spine.                                                                          <br/>
 *     Skeleton has a reference to a SkeletonData and stores the state for skeleton instance,
 *     which consists of the current pose's bone SRT, slot colors, and which slot attachments are visible.           <br/>
 *     Multiple skeletons can use the same SkeletonData (which includes all animations, skins, and attachments).     <br/>
 * </p>
 * @class
 * @extends cc.Node
 */
export class Skeleton extends cc.Node {
  _skeleton = null
  _rootBone = null
  _timeScale = 1
  _debugSlots = false
  _debugBones = false
  _premultipliedAlpha
  _ownsSkeletonData = null
  _atlas = null

  constructor(skeletonDataFile?: string, atlasFile?: string, scale?: number) {
    super()
    super.init()
    this._premultipliedAlpha = cc._renderType === cc.game.RENDER_TYPE_WEBGL && cc.OPTIMIZE_BLEND_FUNC_FOR_PREMULTIPLIED_ALPHA
    this.initWithArgs(skeletonDataFile, atlasFile, scale)
  }

  _createRenderCmd() {
    if (cc._renderType === cc.game.RENDER_TYPE_CANVAS) return new CanvasRenderCmd(this)
    else return new WebGLRenderCmd(this)
  }

  onEnter() {
    super.onEnter()
    this.scheduleUpdate()
  }

  onExit() {
    this.unscheduleUpdate()
    super.onExit()
  }

  /**
   * Sets whether open debug slots.
   * @param {boolean} enable true to open, false to close.
   */
  setDebugSolots(enable: boolean) {
    this._debugSlots = enable
  }

  /**
   * Sets whether open debug bones.
   * @param {boolean} enable
   */
  setDebugBones(enable: boolean) {
    this._debugBones = enable
  }

  /**
   * Sets whether open debug slots.
   * @param {boolean} enabled true to open, false to close.
   */
  setDebugSlotsEnabled(enabled: boolean) {
    this._debugSlots = enabled
  }

  /**
   * Gets whether open debug slots.
   * @returns {boolean} true to open, false to close.
   */
  getDebugSlotsEnabled(): boolean {
    return this._debugSlots
  }

  /**
   * Sets whether open debug bones.
   * @param {boolean} enabled
   */
  setDebugBonesEnabled(enabled: boolean) {
    this._debugBones = enabled
  }

  /**
   * Gets whether open debug bones.
   * @returns {boolean} true to open, false to close.
   */
  getDebugBonesEnabled(): boolean {
    return this._debugBones
  }

  /**
   * Sets the time scale of Skeleton.
   * @param {Number} scale
   */
  setTimeScale(scale: number) {
    this._timeScale = scale
  }

  getTimeScale(): number {
    return this._timeScale
  }

  /**
   * Initializes Skeleton with Data.
   * @param {.spine.SkeletonData|String} skeletonDataFile
   * @param {String|spine.Atlas|spine.SkeletonData} atlasFile atlas filename or atlas data or owns SkeletonData
   * @param {Number} [scale] scale can be specified on the JSON or binary loader which will scale the bone positions, image sizes, and animation translations.
   */
  initWithArgs(skeletonDataFile: string, atlasFile: string, scale?: number) {
    const argSkeletonFile = skeletonDataFile,
      argAtlasFile = atlasFile
    let skeletonData, atlas, ownsSkeletonData

    if (cc.isString(argSkeletonFile)) {
      if (cc.isString(argAtlasFile)) {
        const data = cc.loader.getRes(argAtlasFile)
        _atlasLoader.setAtlasFile(argAtlasFile)
        atlas = new TextureAtlas(data)
        for (const page of atlas.pages) {
          const texture = _atlasLoader.load(page.name)
          page.setTexture(texture)
        }
      }
      scale = scale || 1 / cc.director.getContentScaleFactor()

      const attachmentLoader = new AtlasAttachmentLoader(atlas)
      const skeletonJsonReader = new SkeletonJson(attachmentLoader)
      skeletonJsonReader.scale = scale

      const skeletonJson = cc.loader.getRes(argSkeletonFile)
      skeletonData = skeletonJsonReader.readSkeletonData(skeletonJson)
      atlas.dispose(skeletonJsonReader)
      ownsSkeletonData = true
    } else {
      skeletonData = skeletonDataFile
      ownsSkeletonData = atlasFile
    }
    this.setSkeletonData(skeletonData, ownsSkeletonData)
    this.init()
  }

  /**
   * Returns the bounding box of Skeleton.
   * @returns {cc.Rect}
   */
  getBoundingBox() {
    let minX = cc.FLT_MAX,
      minY = cc.FLT_MAX,
      maxX = cc.FLT_MIN,
      maxY = cc.FLT_MIN
    const scaleX = this.getScaleX(),
      scaleY = this.getScaleY(),
      slots = this._skeleton.slots,
      VERTEX = spine.RegionAttachment
    let vertices

    for (let i = 0, slotCount = slots.length; i < slotCount; ++i) {
      const slot = slots[i]
      const attachment = slot.attachment
      if (!attachment || !(attachment instanceof spine.RegionAttachment)) continue
      vertices = spine.Utils.setArraySize([], 8, 0)
      attachment.computeWorldVertices(slot, vertices, 0, 2)
      minX = Math.min(
        minX,
        vertices[VERTEX.X1] * scaleX,
        vertices[VERTEX.X4] * scaleX,
        vertices[VERTEX.X2] * scaleX,
        vertices[VERTEX.X3] * scaleX,
      )
      minY = Math.min(
        minY,
        vertices[VERTEX.Y1] * scaleY,
        vertices[VERTEX.Y4] * scaleY,
        vertices[VERTEX.Y2] * scaleY,
        vertices[VERTEX.Y3] * scaleY,
      )
      maxX = Math.max(
        maxX,
        vertices[VERTEX.X1] * scaleX,
        vertices[VERTEX.X4] * scaleX,
        vertices[VERTEX.X2] * scaleX,
        vertices[VERTEX.X3] * scaleX,
      )
      maxY = Math.max(
        maxY,
        vertices[VERTEX.Y1] * scaleY,
        vertices[VERTEX.Y4] * scaleY,
        vertices[VERTEX.Y2] * scaleY,
        vertices[VERTEX.Y3] * scaleY,
      )
    }
    const position = this.getPosition()
    return cc.rect(position.x + minX, position.y + minY, maxX - minX, maxY - minY)
  }

  /**
   * Computes the world SRT from the local SRT for each bone.
   */
  updateWorldTransform() {
    this._skeleton.updateWorldTransform(true)
  }

  /**
   * Sets the bones and slots to the setup pose.
   */
  setToSetupPose() {
    this._skeleton.setToSetupPose()
  }

  /**
   * Sets the bones to the setup pose, using the values from the `BoneData` list in the `SkeletonData`.
   */
  setBonesToSetupPose() {
    this._skeleton.setBonesToSetupPose()
  }

  /**
   * Sets the slots to the setup pose, using the values from the `SlotData` list in the `SkeletonData`.
   */
  setSlotsToSetupPose() {
    this._skeleton.setSlotsToSetupPose()
  }

  /**
   * Finds a bone by name. This does a string comparison for every bone.
   * @param {String} boneName
   * @returns {.spine.Bone}
   */
  findBone(boneName: string) {
    return this._skeleton.findBone(boneName)
  }

  /**
   * Finds a slot by name. This does a string comparison for every slot.
   * @param {String} slotName
   * @returns {.spine.Slot}
   */
  findSlot(slotName: string) {
    return this._skeleton.findSlot(slotName)
  }

  /**
   * Finds a skin by name and makes it the active skin. This does a string comparison for every skin. Note that setting the skin does not change which attachments are visible.
   * @param {string} skinName
   * @returns {.spine.Skin}
   */
  setSkin(skinName: string) {
    return this._skeleton.setSkinByName(skinName)
  }

  /**
   * Returns the attachment for the slot and attachment name. The skeleton looks first in its skin, then in the skeleton data’s default skin.
   * @param {String} slotName
   * @param {String} attachmentName
   * @returns {.spine.Attachment}
   */
  getAttachment(slotName: string, attachmentName: string) {
    return this._skeleton.getAttachmentByName(slotName, attachmentName)
  }

  /**
   * Sets the attachment for the slot and attachment name. The skeleton looks first in its skin, then in the skeleton data’s default skin.
   * @param {String} slotName
   * @param {String} attachmentName
   */
  setAttachment(slotName: string, attachmentName: string) {
    this._skeleton.setAttachment(slotName, attachmentName)
  }

  /**
   * Sets the premultiplied alpha value to Skeleton.
   * @param {Number} alpha
   */
  setPremultipliedAlpha(premultiplied: boolean) {
    this._premultipliedAlpha = premultiplied
  }

  /**
   * Returns whether to enable premultiplied alpha.
   * @returns {boolean}
   */
  isPremultipliedAlpha(): boolean {
    return this._premultipliedAlpha
  }

  /**
   * Sets skeleton data to Skeleton.
   * @param {.spine.SkeletonData} skeletonData
   * @param {.spine.SkeletonData} ownsSkeletonData
   */
  setSkeletonData(skeletonData: any, ownsSkeletonData: any) {
    if (skeletonData.width != null && skeletonData.height != null)
      this.setContentSize(
        skeletonData.width / cc.director.getContentScaleFactor(),
        skeletonData.height / cc.director.getContentScaleFactor(),
      )

    this._skeleton = new spine.Skeleton(skeletonData)
    this._skeleton.updateWorldTransform(true)
    this._rootBone = this._skeleton.getRootBone()
    this._ownsSkeletonData = ownsSkeletonData
    ;(this as any)._renderCmd._createChildFormSkeletonData()
  }

  /**
   * Return the renderer of attachment.
   * @param {.spine.RegionAttachment|.spine.BoundingBoxAttachment} regionAttachment
   * @returns {.spine.TextureAtlasRegion}
   */
  getTextureAtlas(regionAttachment: any) {
    return regionAttachment.region
  }

  /**
   * Returns the blendFunc of Skeleton.
   * @returns {cc.BlendFunc}
   */
  getBlendFunc(): any {
    const slot = this._skeleton.drawOrder[0]
    if (slot) {
      const blend = (this as any)._renderCmd._getBlendFunc(slot.data.blendMode, this._premultipliedAlpha)
      return blend
    } else {
      return {}
    }
  }

  /**
   * Sets the blendFunc of Skeleton, it won't have any effect for skeleton, skeleton is using slot's data to determine the blend function.
   * @param {cc.BlendFunc|Number} src
   * @param {Number} [dst]
   */
  setBlendFunc(src: any, dst?: any)
  setBlendFunc() {
    return
  }

  /**
   * Update will be called automatically every frame if "scheduleUpdate" is called when the node is "live".
   * @param {Number} dt Delta time since last update
   */
  update(dt: number) {
    this._skeleton.update(dt)
  }

  // Static create method
  static create(skeletonDataFile: string, atlasFile: string, scale?: number) {
    return new Skeleton(skeletonDataFile, atlasFile, scale)
  }
}
cc.defineGetterSetter(Skeleton.prototype, 'opacityModifyRGB', Skeleton.prototype.isOpacityModifyRGB)

// For renderer webgl to identify skeleton's default texture and blend function
cc.defineGetterSetter(Skeleton.prototype, '_blendFunc', Skeleton.prototype.getBlendFunc)
cc.defineGetterSetter(Skeleton.prototype, '_texture', function () {
  return this._renderCmd._currTexture
})
