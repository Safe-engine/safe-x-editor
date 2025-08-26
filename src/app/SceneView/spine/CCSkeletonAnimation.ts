import * as spine from '@esotericsoftware/spine-core'

import { Skeleton } from './CCSkeleton'
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
    const tex = new SkeletonTexture({ width: texture.getPixelsWide(), height: texture.getPixelsHigh() })
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
const ANIMATION_EVENT_TYPE = {
  START: 0,
  INTERRUPT: 1,
  END: 2,
  DISPOSE: 3,
  COMPLETE: 4,
  EVENT: 5,
}

const TrackEntryListeners = function (
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
 * The skeleton animation of spine. It updates animation's state and skeleton's world transform.
 * @class
 * @extends Skeleton
 */
export class SkeletonAnimation extends Skeleton {
  _state: any = null
  _ownsAnimationStateData = false
  _listener: any = null

  constructor(skeletonDataFile?: any, atlasFile?: any, scale?: number) {
    super(skeletonDataFile, atlasFile, scale)
    this._ownsAnimationStateData = true
    this.setAnimationStateData(new spine.AnimationStateData(this._skeleton.data))
  }

  /**
   * Sets animation state data to SkeletonAnimation.
   * @param {spine.AnimationStateData} stateData
   */
  setAnimationStateData(stateData: any) {
    const state = new spine.AnimationState(stateData)
    this._listener = new TrackEntryListeners()
    state.addListener(this._listener)
    this._state = state
  }

  /**
   * Mix applies all keyframe values, interpolated for the specified time and mixed with the current values.
   * @param {String} fromAnimation
   * @param {String} toAnimation
   * @param {Number} duration
   */
  setMix(fromAnimation: string, toAnimation: string, duration: number) {
    this._state.data.setMixWith(fromAnimation, toAnimation, duration)
  }

  /**
   * Sets event listener of SkeletonAnimation.
   * @param {Object} target
   * @param {Function} callback
   */
  setAnimationListener(target: any, callback: any) {
    this._listener.callbackTarget = target
    this._listener.callback = callback
    this._listener.skeletonNode = this
  }

  /**
   * Set the current animation. Any queued animations are cleared.
   * @param {Number} trackIndex
   * @param {String} name
   * @param {Boolean} loop
   * @returns {spine.TrackEntry|null}
   */
  setAnimation(trackIndex: number, name: string, loop: boolean) {
    const animation = this._skeleton.data.findAnimation(name)
    if (!animation) {
      cc.log(`Spine: Animation not found: ${name}`)
      return null
    }
    return this._state.setAnimationWith(trackIndex, animation, loop)
  }

  /**
   * Adds an animation to be played delay seconds after the current or last queued animation.
   * @param {Number} trackIndex
   * @param {String} name
   * @param {Boolean} loop
   * @param {Number} [delay=0]
   * @returns {spine.TrackEntry|null}
   */
  addAnimation(trackIndex: number, name: string, loop: boolean, delay?: number) {
    delay = delay == null ? 0 : delay
    const animation = this._skeleton.data.findAnimation(name)
    if (!animation) {
      cc.log(`Spine: Animation not found:${name}`)
      return null
    }
    return this._state.addAnimationWith(trackIndex, animation, loop, delay)
  }

  /**
   * Find animation with specified name
   * @param {String} name
   * @returns {spine.Animation|null}
   */
  findAnimation(name: string) {
    return this._skeleton.data.findAnimation(name)
  }

  /**
   * Returns track entry by trackIndex.
   * @param trackIndex
   * @returns {spine.TrackEntry|null}
   */
  getCurrent(trackIndex: number) {
    return this._state.getCurrent(trackIndex)
  }

  /**
   * Clears all tracks of animation state.
   */
  clearTracks() {
    this._state.clearTracks()
  }

  /**
   * Clears track of animation state by trackIndex.
   * @param {Number} trackIndex
   */
  clearTrack(trackIndex: number) {
    this._state.clearTrack(trackIndex)
  }

  /**
   * Update will be called automatically every frame if "scheduleUpdate" is called when the node is "live".
   * It updates animation's state and skeleton's world transform.
   * @param {Number} dt Delta time since last update
   * @override
   */
  update(dt: number) {
    super.update(dt)
    dt *= this._timeScale
    ;(this as any)._renderCmd.setDirtyFlag(cc.Node._dirtyFlags.contentDirty)
    this._state.update(dt)
    this._state.apply(this._skeleton)
    this._skeleton.updateWorldTransform(true)
    ;(this as any)._renderCmd._updateChild()
  }

  /**
   * Set the start event listener.
   * @param {function} listener
   */
  setStartListener(listener: any) {
    this._listener.startListener = listener
  }

  /**
   * Set the interrupt listener
   * @param {function} listener
   */
  setInterruptListener(listener: any) {
    this._listener.interruptListener = listener
  }

  /**
   * Set the end event listener.
   * @param {function} listener
   */
  setEndListener(listener: any) {
    this._listener.endListener = listener
  }

  /**
   * Set the dispose listener
   * @param {function} listener
   */
  setDisposeListener(listener: any) {
    this._listener.disposeListener = listener
  }

  setCompleteListener(listener: any) {
    this._listener.completeListener = listener
  }

  setEventListener(listener: any) {
    this._listener.eventListener = listener
  }

  setTrackStartListener(entry: any, listener: any) {
    TrackEntryListeners.getListeners(entry).startListener = listener
  }

  setTrackInterruptListener(entry: any, listener: any) {
    TrackEntryListeners.getListeners(entry).interruptListener = listener
  }

  setTrackEndListener(entry: any, listener: any) {
    TrackEntryListeners.getListeners(entry).endListener = listener
  }

  setTrackDisposeListener(entry: any, listener: any) {
    TrackEntryListeners.getListeners(entry).disposeListener = listener
  }

  setTrackCompleteListener(entry: any, listener: any) {
    TrackEntryListeners.getListeners(entry).completeListener = listener
  }

  setTrackEventListener(entry: any, listener: any) {
    TrackEntryListeners.getListeners(entry).eventListener = listener
  }

  getState() {
    return this._state
  }

  /**
   * Creates a skeleton animation object.
   * @deprecated since v3.0, please use new SkeletonAnimation(skeletonDataFile, atlasFile, scale) instead.
   * @param {spine.SkeletonData|String} skeletonDataFile
   * @param {String|spine.Atlas|spine.SkeletonData} atlasFile atlas filename or atlas data or owns SkeletonData
   * @param {Number} [scale]
   * @returns {SkeletonAnimation}
   */
  static createWithJsonFile(skeletonDataFile: any, atlasFile: any, scale?: number) {
    return new SkeletonAnimation(skeletonDataFile, atlasFile, scale)
  }

  static create(skeletonDataFile: any, atlasFile: any, scale?: number) {
    return new SkeletonAnimation(skeletonDataFile, atlasFile, scale)
  }
}
