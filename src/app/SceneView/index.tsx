import { Engine, loadScene } from '@safe-engine/sdl';
import { PreviewScene } from './PreviewScene';

export default function SceneView() {
 Engine.start('Safex SDL Preview', window.innerWidth, window.innerHeight, 'fixed-width')
loadScene(PreviewScene)


  return (
    <div className='w-full h-full'>
      <canvas id="sdl-canvas"></canvas>
    </div>
  );
}
