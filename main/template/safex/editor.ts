import { addGameCanvasTo, app, GUISystem, RenderSystem, setupResolution, startGameWithSystems } from '@safe-engine/pixi'
import { extensions, ResizePlugin, TickerPlugin } from 'pixi.js';

import { loadAssets } from '../binding/loader';
import { settings } from '../settings'
import { EditingScene } from './EditingScene';

const { designedResolution } = settings;
const systemsList = [
  RenderSystem,
  GUISystem,
];

async function start() {
  await addGameCanvasTo()
  Object.assign(app.canvas.style, {
    width: `${window.innerWidth}px`,
    height: `${window.innerHeight}px`,
    overflow: 'visible',
  })
  setupResolution(designedResolution)
  startGameWithSystems(systemsList)
  await loadAssets((progress) => {
    if (progress >= 1) {
      EditingScene.create()
    }
  })
};
start()

if (module.hot) {
  module.hot.dispose(() => {
    try {
      extensions.remove(ResizePlugin);
      extensions.remove(TickerPlugin);
    } catch (error) {
      console.log(error)
    }
  })
  module.hot.accept(() => {
    console.log('hot accept is needed');
  })
}
