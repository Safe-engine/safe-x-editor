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

import { BlendMode, MeshAttachment, RegionAttachment, Utils } from '@esotericsoftware/spine-core'

export const WebGLRenderCmd = function (renderableObject) {
  this._rootCtor(renderableObject)
  this._needDraw = true
  this._matrix = new cc.math.Matrix4()
  this._matrix.identity()
  this._currTexture = null
  this._currBlendFunc = {}
  this.vertexType = cc.renderer.VertexType.CUSTOM
  this.setShaderProgram(cc.shaderCache.programForKey(cc.SHADER_SPRITE_POSITION_TEXTURECOLOR))
}

const proto = (WebGLRenderCmd.prototype = Object.create(cc.Node.WebGLRenderCmd.prototype))
proto.constructor = WebGLRenderCmd

proto.uploadData = function (f32buffer, ui32buffer, vertexDataOffset) {
  const node = this._node
  const color = this._displayedColor,
    locSkeleton = node._skeleton

  let attachment, slot, i, n
  const premultiAlpha = node._premultipliedAlpha

  locSkeleton.r = color.r / 255
  locSkeleton.g = color.g / 255
  locSkeleton.b = color.b / 255
  locSkeleton.a = this._displayedOpacity / 255
  if (premultiAlpha) {
    locSkeleton.r *= locSkeleton.a
    locSkeleton.g *= locSkeleton.a
    locSkeleton.b *= locSkeleton.a
  }

  let debugSlotsInfo = null
  if (this._node._debugSlots) {
    debugSlotsInfo = []
  }

  for (i = 0, n = locSkeleton.drawOrder.length; i < n; i++) {
    slot = locSkeleton.drawOrder[i]
    if (!slot.attachment) continue
    attachment = slot.attachment

    // get the vertices length
    let vertCount = 0
    if (attachment instanceof RegionAttachment) {
      vertCount = 6 // a quad = two triangles = six vertices
    } else if (attachment instanceof MeshAttachment) {
      vertCount = attachment.regionUVs.length / 2
    } else {
      continue
    }

    // no vertices to render
    if (vertCount === 0) {
      continue
    }

    const regionTextureAtlas = node.getTextureAtlas(attachment)
    // Broken for changing batch info
    let batchBroken
    if (regionTextureAtlas.texture) {
      this._currTexture = regionTextureAtlas.texture.getRealTexture()
      batchBroken = cc.renderer._updateBatchedInfo(
        this._currTexture,
        this._getBlendFunc(slot.data.blendMode, premultiAlpha),
        this._glProgramState,
      )
    }
    // keep the same logic with RendererWebGL.js, avoid vertex data overflow
    const uploadAll = vertexDataOffset / 6 + vertCount > (cc.BATCH_VERTEX_COUNT - 200) * 0.5
    // Broken for vertex data overflow
    if (!batchBroken && uploadAll) {
      // render the cached data
      cc.renderer._batchRendering()
      batchBroken = true
    }
    if (batchBroken) {
      vertexDataOffset = 0
    }

    // update the vertex buffer
    let slotDebugPoints = null
    if (attachment instanceof RegionAttachment) {
      slotDebugPoints = this._uploadRegionAttachmentData(attachment, slot, premultiAlpha, f32buffer, ui32buffer, vertexDataOffset)
    } else if (attachment instanceof MeshAttachment) {
      this._uploadMeshAttachmentData(attachment, slot, premultiAlpha, f32buffer, ui32buffer, vertexDataOffset)
    } else {
      continue
    }

    if (this._node._debugSlots) {
      debugSlotsInfo[i] = slotDebugPoints
    }

    // update the index buffer
    if (attachment instanceof RegionAttachment) {
      cc.renderer._increaseBatchingSize(vertCount, cc.renderer.VertexType.TRIANGLE)
    } else {
      cc.renderer._increaseBatchingSize(vertCount, cc.renderer.VertexType.CUSTOM, attachment.triangles)
    }

    // update the index data
    vertexDataOffset += vertCount * 6
  }

  if (node._debugBones || node._debugSlots) {
    // flush previous vertices
    cc.renderer._batchRendering()

    const wt = this._worldTransform,
      mat = this._matrix.mat
    mat[0] = wt.a
    mat[4] = wt.c
    mat[12] = wt.tx
    mat[1] = wt.b
    mat[5] = wt.d
    mat[13] = wt.ty
    cc.kmGLMatrixMode(cc.KM_GL_MODELVIEW)
    cc.current_stack.stack.push(cc.current_stack.top)
    cc.current_stack.top = this._matrix
    const drawingUtil = cc._drawingUtil

    if (node._debugSlots && debugSlotsInfo && debugSlotsInfo.length > 0) {
      // Slots.
      drawingUtil.setDrawColor(0, 0, 255, 255)
      drawingUtil.setLineWidth(1)

      for (i = 0, n = locSkeleton.slots.length; i < n; i++) {
        const points = debugSlotsInfo[i]
        if (points) {
          drawingUtil.drawPoly(points, 4, true)
        }
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
        drawingUtil.drawLine(cc.p(bone.worldX, bone.worldY), cc.p(x, y))
      }

      // Bone origins.
      drawingUtil.setPointSize(4)
      drawingUtil.setDrawColor(0, 0, 255, 255) // Root bone is blue.

      for (i = 0, n = locSkeleton.bones.length; i < n; i++) {
        bone = locSkeleton.bones[i]
        drawingUtil.drawPoint(cc.p(bone.worldX, bone.worldY))
        if (i == 0) {
          drawingUtil.setDrawColor(0, 255, 0, 255)
        }
      }
    }
    cc.kmGLPopMatrix()
  }

  return 0
}

proto._getBlendFunc = function (blendMode, premultiAlpha) {
  let ret = this._currBlendFunc
  switch (blendMode) {
    case BlendMode.Normal:
      ret.src = premultiAlpha ? cc.ONE : cc.SRC_ALPHA
      ret.dst = cc.ONE_MINUS_SRC_ALPHA
      break
    case BlendMode.Additive:
      ret.src = premultiAlpha ? cc.ONE : cc.SRC_ALPHA
      ret.dst = cc.ONE
      break
    case BlendMode.Multiply:
      ret.src = cc.DST_COLOR
      ret.dst = cc.ONE_MINUS_SRC_ALPHA
      break
    case BlendMode.Screen:
      ret.src = cc.ONE
      ret.dst = cc.ONE_MINUS_SRC_COLOR
      break
    default:
      ret = this._node._blendFunc
      break
  }

  return ret
}

proto._createChildFormSkeletonData = function () {}

proto._updateChild = function () {}

proto._uploadRegionAttachmentData = function (attachment, slot, premultipliedAlpha, f32buffer, ui32buffer, vertexDataOffset) {
  // the vertices in format:
  // [
  //   X1, Y1, C1R, C1G, C1B, C1A, U1, V1,    // bottom left
  //   X2, Y2, C2R, C2G, C2B, C2A, U2, V2,    // top left
  //   X3, Y3, C3R, C3G, C3B, C3A, U3, V3,    // top right
  //   X4, Y4, C4R, C4G, C4B, C4A, U4, V4     // bottom right
  // ]
  //
  const nodeColor = this._displayedColor
  const nodeR = nodeColor.r,
    nodeG = nodeColor.g,
    nodeB = nodeColor.b,
    nodeA = this._displayedOpacity

  const vertices = Utils.setArraySize([], 8, 0)
  attachment.computeWorldVertices(slot, vertices, 0, 2)

  const uvs = attachment.uvs

  // get the colors data
  const skeleton = slot.bone.skeleton
  const skeletonColor = skeleton.color
  const slotColor = slot.color
  const regionColor = attachment.color
  const alpha = skeletonColor.a * slotColor.a * regionColor.a
  const multiplier = premultipliedAlpha ? alpha : 1
  const colors = attachment.tempColor
  colors.set(
    skeletonColor.r * slotColor.r * regionColor.r * multiplier,
    skeletonColor.g * slotColor.g * regionColor.g * multiplier,
    skeletonColor.b * slotColor.b * regionColor.b * multiplier,
    alpha,
  )

  const wt = this._worldTransform,
    wa = wt.a,
    wb = wt.b,
    wc = wt.c,
    wd = wt.d,
    wx = wt.tx,
    wy = wt.ty,
    z = this._node.vertexZ

  let offset = vertexDataOffset
  // generate 6 vertices data (two triangles) from the quad vertices
  // using two angles : (0, 1, 2) & (0, 2, 3)
  for (let i = 0; i < 6; i++) {
    const srcIdx = i < 4 ? i % 3 : i - 2
    const vx = vertices[srcIdx * 2],
      vy = vertices[srcIdx * 2 + 1]
    const x = vx * wa + vy * wc + wx,
      y = vx * wb + vy * wd + wy
    const r = colors.r * nodeR,
      g = colors.g * nodeG,
      b = colors.b * nodeB,
      a = colors.a * nodeA
    const color = (a << 24) | (b << 16) | (g << 8) | r
    f32buffer[offset] = x
    f32buffer[offset + 1] = y
    f32buffer[offset + 2] = z
    ui32buffer[offset + 3] = color
    f32buffer[offset + 4] = uvs[srcIdx * 2]
    f32buffer[offset + 5] = uvs[srcIdx * 2 + 1]
    offset += 6
  }

  if (this._node._debugSlots) {
    // return the quad points info if debug slot enabled
    const VERTEX = RegionAttachment
    return [
      cc.p(vertices[VERTEX.X1], vertices[VERTEX.Y1]),
      cc.p(vertices[VERTEX.X2], vertices[VERTEX.Y2]),
      cc.p(vertices[VERTEX.X3], vertices[VERTEX.Y3]),
      cc.p(vertices[VERTEX.X4], vertices[VERTEX.Y4]),
    ]
  }
}

proto._uploadMeshAttachmentData = function (attachment, slot, premultipliedAlpha, f32buffer, ui32buffer, vertexDataOffset) {
  const wt = this._worldTransform,
    wa = wt.a,
    wb = wt.b,
    wc = wt.c,
    wd = wt.d,
    wx = wt.tx,
    wy = wt.ty,
    z = this._node.vertexZ
  // get the vertex data
  const verticesLength = attachment.worldVerticesLength
  const vertices = Utils.setArraySize([], verticesLength, 0)
  attachment.computeWorldVertices(slot, 0, verticesLength, vertices, 0, 2)

  const uvs = attachment.uvs

  // get the colors data
  const skeleton = slot.bone.skeleton
  const skeletonColor = skeleton.color,
    slotColor = slot.color,
    meshColor = attachment.color
  const alpha = skeletonColor.a * slotColor.a * meshColor.a
  const multiplier = premultipliedAlpha ? alpha : 1
  const colors = attachment.tempColor
  colors.set(
    skeletonColor.r * slotColor.r * meshColor.r * multiplier,
    skeletonColor.g * slotColor.g * meshColor.g * multiplier,
    skeletonColor.b * slotColor.b * meshColor.b * multiplier,
    alpha,
  )

  let offset = vertexDataOffset
  const nodeColor = this._displayedColor
  const nodeR = nodeColor.r,
    nodeG = nodeColor.g,
    nodeB = nodeColor.b,
    nodeA = this._displayedOpacity
  for (let i = 0, n = vertices.length; i < n; i += 2) {
    const vx = vertices[i],
      vy = vertices[i + 1]
    const x = vx * wa + vy * wb + wx,
      y = vx * wc + vy * wd + wy
    const r = colors.r * nodeR,
      g = colors.g * nodeG,
      b = colors.b * nodeB,
      a = colors.a * nodeA
    const color = (a << 24) | (b << 16) | (g << 8) | r

    f32buffer[offset] = x
    f32buffer[offset + 1] = y
    f32buffer[offset + 2] = z
    ui32buffer[offset + 3] = color
    f32buffer[offset + 4] = uvs[i]
    f32buffer[offset + 5] = uvs[i + 1]
    offset += 6
  }
}
