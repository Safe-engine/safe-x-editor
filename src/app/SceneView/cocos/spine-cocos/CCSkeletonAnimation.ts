/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import {
  Animation,
  AnimationState,
  AnimationStateData,
  AtlasAttachmentLoader,
  Physics,
  SkeletonBinary,
  TextureAtlas,
} from '@esotericsoftware/spine-core'
import { CCSkeleton } from './CCSkeleton'
import { SkeletonTexture } from './CCSkeletonTexture'
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

export const _atlasLoader = {
  spAtlasFile: null,
  setAtlasFile: function (spAtlasFile) {
    this.spAtlasFile = spAtlasFile
  },
  load: function (line) {
    const texturePath = cc.path.join(cc.path.dirname(this.spAtlasFile), line)
    const texture = cc.textureCache.addImage(texturePath)
    const tex = new SkeletonTexture()
    tex.setRealTexture(texture)
    return tex
  },
  unload: function () {},
}

/**
 * The event type of spine skeleton animation. It contains event types: START(0), END(1), COMPLETE(2), EVENT(3).
 * @constant
 * @type {{START: number, END: number, COMPLETE: number, EVENT: number}}
 */
export const ANIMATION_EVENT_TYPE = {
  START: 0,
  INTERRUPT: 1,
  END: 2,
  DISPOSE: 3,
  COMPLETE: 4,
  EVENT: 5,
}

export const TrackEntryListeners = function (
  startListener?,
  endListener?,
  completeListener?,
  eventListener?,
  interruptListener?,
  disposeListener?,
) {
  this.startListener = startListener || null
  this.endListener = endListener || null
  this.completeListener = completeListener || null
  this.eventListener = eventListener || null
  this.interruptListener = interruptListener || null
  this.disposeListener = disposeListener || null
  this.callback = null
  this.callbackTarget = null
  this.skeletonNode = null
}

const proto = TrackEntryListeners.prototype
proto.start = function (trackEntry) {
  if (this.startListener) {
    this.startListener(trackEntry)
  }
  if (this.callback) {
    this.callback.call(this.callbackTarget, this.skeletonNode, trackEntry, ANIMATION_EVENT_TYPE.START, null, 0)
  }
}

proto.interrupt = function (trackEntry) {
  if (this.interruptListener) {
    this.interruptListener(trackEntry)
  }
  if (this.callback) {
    this.callback.call(this.callbackTarget, this.skeletonNode, trackEntry, ANIMATION_EVENT_TYPE.INTERRUPT, null, 0)
  }
}

proto.end = function (trackEntry) {
  if (this.endListener) {
    this.endListener(trackEntry)
  }
  if (this.callback) {
    this.callback.call(this.callbackTarget, this.skeletonNode, trackEntry, ANIMATION_EVENT_TYPE.END, null, 0)
  }
}

proto.dispose = function (trackEntry) {
  if (this.disposeListener) {
    this.disposeListener(trackEntry)
  }
  if (this.callback) {
    this.callback.call(this.callbackTarget, this.skeletonNode, trackEntry, ANIMATION_EVENT_TYPE.DISPOSE, null, 0)
  }
}

proto.complete = function (trackEntry) {
  const loopCount = Math.floor(trackEntry.trackTime / trackEntry.animationEnd)
  if (this.completeListener) {
    this.completeListener(trackEntry, loopCount)
  }
  if (this.callback) {
    this.callback.call(this.callbackTarget, this.skeletonNode, trackEntry, ANIMATION_EVENT_TYPE.COMPLETE, null, loopCount)
  }
}

proto.event = function (trackEntry, event) {
  if (this.eventListener) {
    this.eventListener(trackEntry, event)
  }
  if (this.callback) {
    this.callback.call(this.callbackTarget, this.skeletonNode, trackEntry, ANIMATION_EVENT_TYPE.EVENT, event, 0)
  }
}

TrackEntryListeners.getListeners = function (entry) {
  if (!entry.listener) {
    entry.listener = new TrackEntryListeners()
  }
  return entry.listener
}

/**
 * The skeleton animation of  It updates animation's state and skeleton's world transform.
 * @class
 * @extends Skeleton
 * @example
 * var spineBoy = new SkeletonAnimation('res/skeletons/spineboy.json', 'res/skeletons/spineboy.atlas');
 * this.addChild(spineBoy, 4);
 */

export class SkeletonAnimation extends CCSkeleton {
  init(): boolean {
    super.init()
    this._ownsAnimationStateData = true
    this.setAnimationStateData(new AnimationStateData(this._skeleton.data))
    return true
  }

  setAnimationStateData(stateData: AnimationStateData) {
    const state = new AnimationState(stateData)
    this._listener = new TrackEntryListeners()
    state.addListener(this._listener)
    this._state = state
  }

  setMix(fromAnimation: Animation, toAnimation: Animation, duration: number) {
    this._state.data.setMixWith(fromAnimation, toAnimation, duration)
  }

  setAnimationListener(target: any, callback: Function) {
    this._listener.callbackTarget = target
    this._listener.callback = callback
    this._listener.skeletonNode = this
  }

  setAnimation(trackIndex: number, name: string, loop: boolean) {
    const animation = this._skeleton.data.findAnimation(name)
    if (!animation) {
      cc.log(`Spine: Animation not found: ${name}/${this._skeleton.data.animations.map((a) => a.name)} `)
      return null
    }
    return this._state.setAnimationWith(trackIndex, animation, loop)
  }

  addAnimation(trackIndex: number, name: string, loop: boolean, delay?: number) {
    delay = delay == null ? 0 : delay
    const animation = this._skeleton.data.findAnimation(name)
    if (!animation) {
      cc.log(`Spine: Animation not found:${name}`)
      return null
    }
    return this._state.addAnimationWith(trackIndex, animation, loop, delay)
  }

  findAnimation(name: string) {
    return this._skeleton.data.findAnimation(name)
  }

  getCurrent(trackIndex: number) {
    return this._state.getCurrent(trackIndex)
  }

  clearTracks() {
    this._state.clearTracks()
  }

  clearTrack(trackIndex: number) {
    this._state.clearTrack(trackIndex)
  }

  update(dt: number) {
    super.update(dt)
    dt *= this._timeScale
    if (this._renderCmd && typeof this._renderCmd.setDirtyFlag === 'function') {
      this._renderCmd.setDirtyFlag(cc.Node._dirtyFlags.contentDirty)
    }
    this._state.update(dt)
    this._state.apply(this._skeleton)
    this._skeleton.updateWorldTransform(Physics.pose)
    if (this._renderCmd && typeof this._renderCmd._updateChild === 'function') {
      this._renderCmd._updateChild()
    }
  }

  setStartListener(listener: Function) {
    this._listener.startListener = listener
  }

  setInterruptListener(listener: Function) {
    this._listener.interruptListener = listener
  }

  setEndListener(listener: Function) {
    this._listener.endListener = listener
  }

  setDisposeListener(listener: Function) {
    this._listener.disposeListener = listener
  }

  setCompleteListener(listener: Function) {
    this._listener.completeListener = listener
  }

  setEventListener(listener: Function) {
    this._listener.eventListener = listener
  }

  setTrackStartListener(entry: any, listener: Function) {
    TrackEntryListeners.getListeners(entry).startListener = listener
  }

  setTrackInterruptListener(entry: any, listener: Function) {
    TrackEntryListeners.getListeners(entry).interruptListener = listener
  }

  setTrackEndListener(entry: any, listener: Function) {
    TrackEntryListeners.getListeners(entry).endListener = listener
  }

  setTrackDisposeListener(entry: any, listener: Function) {
    TrackEntryListeners.getListeners(entry).disposeListener = listener
  }

  setTrackCompleteListener(entry: any, listener: Function) {
    TrackEntryListeners.getListeners(entry).completeListener = listener
  }

  setTrackEventListener(entry: any, listener: Function) {
    TrackEntryListeners.getListeners(entry).eventListener = listener
  }

  getState() {
    return this._state
  }

  static createWithJsonFile(skeletonDataFile: any, atlasFile: any, scale?: any) {
    return new SkeletonAnimation(skeletonDataFile, atlasFile, scale)
  }

  static createWithBinaryFile(skeletonDataFile: any, atlasFile: any, scale?: any) {
    const dataTex = cc.loader.getRes(atlasFile)
    _atlasLoader.setAtlasFile(atlasFile)
    const atlas = new TextureAtlas(dataTex)
    for (const page of atlas.pages) {
      const texture = _atlasLoader.load(page.name)
      page.setTexture(texture)
    }
    const attachmentLoader = new AtlasAttachmentLoader(atlas)
    const skeletonBinaryReader = new SkeletonBinary(attachmentLoader)
    const skeletonBinary = cc.loader.getRes(skeletonDataFile)
    const skeletonData = skeletonBinaryReader.readSkeletonData(skeletonBinary)
    return new SkeletonAnimation(skeletonData, true, scale)
  }
}
