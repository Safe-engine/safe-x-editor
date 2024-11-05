import { ComponentX, SceneComponent } from '@safe-engine/pixi';
import { Assets, Sprite } from 'pixi.js'

import { EditingScene } from './EditingScene'

export class Boot extends ComponentX {
  async start() {
    await Assets.load<Sprite>([]);
    EditingScene.create()
  }

  static create() {
    return (
      <SceneComponent>
      </SceneComponent>
    )
  }
}
