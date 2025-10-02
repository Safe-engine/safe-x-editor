/****************************************************************************
 Copyright (c) 2013-2014 Chukong Technologies Inc.

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

import { MeshAttachment, RegionAttachment, Utils } from '@esotericsoftware/spine-core'

export const CanvasRenderCmd = function (renderableObject) {
  this._rootCtor(renderableObject)
  this._needDraw = true
}

const proto = (CanvasRenderCmd.prototype = Object.create(cc.Node.CanvasRenderCmd.prototype))
proto.constructor = CanvasRenderCmd

proto.rendering = function (wrapper, scaleX, scaleY) {
  const node = this._node
  let i, n, slot, slotNode
  wrapper = wrapper || cc._renderContext

  const locSkeleton = node._skeleton,
    drawOrder = locSkeleton.drawOrder
  for (i = 0, n = drawOrder.length; i < n; i++) {
    slot = drawOrder[i]
    slotNode = slot._slotNode
    if (slotNode._visible && slotNode._renderCmd && slot.currentSprite) {
      slotNode._renderCmd.transform(this, true)
      slot.currentSprite._renderCmd.rendering(wrapper, scaleX, scaleY)
      slotNode._renderCmd._dirtyFlag = slot.currentSprite._renderCmd._dirtyFlag = 0
    }
  }

  if (!node._debugSlots && !node._debugBones) return

  wrapper.setTransform(this._worldTransform, scaleX, scaleY)
  wrapper.setGlobalAlpha(1)
  let attachment
  const drawingUtil = cc._drawingUtil
  if (node._debugSlots) {
    // Slots.
    drawingUtil.setDrawColor(0, 0, 255, 255)
    drawingUtil.setLineWidth(1)

    const points = []
    for (i = 0, n = locSkeleton.slots.length; i < n; i++) {
      slot = locSkeleton.drawOrder[i]
      if (!slot.attachment || !(slot.attachment instanceof RegionAttachment)) continue
      attachment = slot.attachment
      this._updateRegionAttachmentSlot(attachment, slot, points)
      drawingUtil.drawPoly(points, 4, true)
    }
  }

  if (node._debugBones) {
    // Bone lengths.
    let bone
    drawingUtil.setLineWidth(2)
    drawingUtil.setDrawColor(255, 0, 0, 255)

    for (i = 0, n = locSkeleton.bones.length; i < n; i++) {
      bone = locSkeleton.bones[i]
      const x = bone.data.length * bone.a + bone.worldX
      const y = bone.data.length * bone.c + bone.worldY
      drawingUtil.drawLine({ x: bone.worldX, y: bone.worldY }, { x: x, y: y })
    }

    // Bone origins.
    const pointSize = 4
    drawingUtil.setDrawColor(0, 0, 255, 255) // Root bone is blue.

    for (i = 0, n = locSkeleton.bones.length; i < n; i++) {
      bone = locSkeleton.bones[i]
      drawingUtil.drawPoint({ x: bone.worldX, y: bone.worldY }, pointSize)
      if (i === 0) drawingUtil.setDrawColor(0, 255, 0, 255)
    }
  }
}

proto.updateStatus = function () {
  this.originUpdateStatus()
  this._updateCurrentRegions()
  this._regionFlag = cc.Node.CanvasRenderCmd.RegionStatus.DirtyDouble
  this._dirtyFlag &= ~cc.Node._dirtyFlags.contentDirty
}

proto.getLocalBB = function () {
  return this._node.getBoundingBox()
}

proto._updateRegionAttachmentSlot = function (attachment, slot, points) {
  if (!points) return

  const vertices = Utils.setArraySize([], 8, 0)
  attachment.computeWorldVertices(slot, vertices, 0, 2)
  const VERTEX = RegionAttachment
  points.length = 0
  points.push(cc.p(vertices[VERTEX.X1], vertices[VERTEX.Y1]))
  points.push(cc.p(vertices[VERTEX.X4], vertices[VERTEX.Y4]))
  points.push(cc.p(vertices[VERTEX.X3], vertices[VERTEX.Y3]))
  points.push(cc.p(vertices[VERTEX.X2], vertices[VERTEX.Y2]))
}

proto._createChildFormSkeletonData = function () {
  const node = this._node
  const locSkeleton = node._skeleton
  let spriteName, sprite
  for (let i = 0, n = locSkeleton.slots.length; i < n; i++) {
    const slot = locSkeleton.slots[i],
      attachment = slot.attachment
    const slotNode = new cc.Node()
    slot._slotNode = slotNode

    if (attachment instanceof RegionAttachment) {
      spriteName = attachment.name
      sprite = this._createSprite(slot, attachment)
      slot.currentSprite = sprite
      slot.currentSpriteName = spriteName
      slotNode.addChild(sprite)
    } else if (attachment instanceof MeshAttachment) {
      //todo for mesh
    }
  }
}

const loaded = function (sprite, texture, attachment) {
  const rendererObject = attachment.region
  const rect = new cc.Rect(rendererObject.x, rendererObject.y, rendererObject.width, rendererObject.height)
  sprite.initWithTexture(texture, rect, rendererObject.rotate, false)
  sprite._rect.width = attachment.width
  sprite._rect.height = attachment.height
  sprite.setContentSize(attachment.width, attachment.height)
  sprite.setRotation(-attachment.rotation)
  sprite.setScale(
    (rendererObject.width / rendererObject.originalWidth) * attachment.scaleX,
    (rendererObject.height / rendererObject.originalHeight) * attachment.scaleY,
  )
}

proto._createSprite = function (slot, attachment) {
  const rendererObject = attachment.region
  const texture = rendererObject.texture.getRealTexture()
  const sprite = new cc.Sprite()
  if (texture.isLoaded()) {
    loaded(sprite, texture, attachment)
  } else {
    texture.addEventListener(
      'load',
      function () {
        loaded(sprite, texture, attachment)
      },
      this,
    )
  }
  slot.sprites = slot.sprites || {}
  slot.sprites[rendererObject.name] = sprite
  return sprite
}

proto._updateChild = function () {
  const locSkeleton = this._node._skeleton,
    slots = locSkeleton.slots
  const color = this._displayedColor,
    opacity = this._displayedOpacity
  let i, n, selSprite, ax, ay

  let slot, attachment, slotNode
  for (i = 0, n = slots.length; i < n; i++) {
    slot = slots[i]
    attachment = slot.attachment
    slotNode = slot._slotNode
    if (!attachment) {
      slotNode.setVisible(false)
      continue
    }
    if (attachment instanceof RegionAttachment) {
      if (attachment.region) {
        if (!slot.currentSpriteName || slot.currentSpriteName !== attachment.name) {
          const spriteName = attachment.name
          if (slot.currentSprite !== undefined) slot.currentSprite.setVisible(false)
          slot.sprites = slot.sprites || {}
          if (slot.sprites[spriteName] !== undefined) slot.sprites[spriteName].setVisible(true)
          else {
            const sprite = this._createSprite(slot, attachment)
            slotNode.addChild(sprite)
          }
          slot.currentSprite = slot.sprites[spriteName]
          slot.currentSpriteName = spriteName
        }
      }
      const bone = slot.bone
      if (attachment.region.offsetX === 0 && attachment.region.offsetY === 0) {
        ax = attachment.x
        ay = attachment.y
      } else {
        //var regionScaleX = attachment.width / attachment.regionOriginalWidth * attachment.scaleX;
        //ax = attachment.x + attachment.regionOffsetX * regionScaleX - (attachment.width * attachment.scaleX - attachment.regionWidth * regionScaleX) / 2;
        ax = (attachment.offset[0] + attachment.offset[4]) * 0.5
        ay = (attachment.offset[1] + attachment.offset[5]) * 0.5
      }
      slotNode.setPosition(bone.worldX + ax * bone.a + ay * bone.b, bone.worldY + ax * bone.c + ay * bone.d)
      slotNode.setScale(bone.getWorldScaleX(), bone.getWorldScaleY())

      //set the color and opacity
      selSprite = slot.currentSprite
      selSprite._flippedX = bone.skeleton.flipX
      selSprite._flippedY = bone.skeleton.flipY
      if (selSprite._flippedY || selSprite._flippedX) {
        slotNode.setRotation(bone.getWorldRotationX())
        selSprite.setRotation(attachment.rotation)
      } else {
        slotNode.setRotation(-bone.getWorldRotationX())
        selSprite.setRotation(-attachment.rotation)
      }

      //hack for sprite
      selSprite._renderCmd._displayedOpacity = 0 | (opacity * slot.color.a)
      const r = 0 | (color.r * slot.color.r),
        g = 0 | (color.g * slot.color.g),
        b = 0 | (color.b * slot.color.b)
      selSprite.setColor(cc.color(r, g, b))
      selSprite._renderCmd._updateColor()
    } else if (attachment instanceof MeshAttachment) {
      // Can not render mesh
    } else {
      slotNode.setVisible(false)
      continue
    }
    slotNode.setVisible(true)
  }
}
