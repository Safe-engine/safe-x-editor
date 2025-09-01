import { parseInt } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import NumberInput from '../../base/NumberInput';
import { getLastMoveSpeed, getLastSceneScale, getLastSceneX, getLastSceneY, setLastMoveSpeed, setLastSceneScale, setLastSceneX, setLastSceneY } from '../../data/AppData';
import { getNodePosition, Vec2 } from '../../helper/node';
import { useActions, useSelector } from '../../states/app.context';
import { selectAssets, selectComponentsCache, selectComponentTree, selectDesignResolution, selectIsPixi, selectRootFolder, selectSelectedEditingPath, selectSelectedNodes, selectSelectedPaths } from '../../states/app.selectors';
import ArrowControl from './ArrowControl';
import { getDrawNode, loadSceneViewCocos, onStart } from './cocos';
import { createPixiApp, loadSceneViewPixi } from './pixi';
declare let PIXI: any

function getCurrentNode(editingClassNamePath: string, parentNode: any, isSceneNode: boolean) {
  const childrenIndex = editingClassNamePath.split('-').map(parseInt);
  if (isSceneNode)
    childrenIndex.shift();
  let currentNode = parentNode;
  childrenIndex.forEach((child, i) => {
    const index = i === 0 ? child + 1 : child;
    if (currentNode.children[index])
      currentNode = currentNode.children[index];
  });
  console.log('currentNode', parentNode, childrenIndex, currentNode)
  return currentNode;
}

export default function SceneView() {
  const { updateMultiNodes } = useActions();
  const [position, setPosition] = useState({ x: 200, y: 200 });
  const [isEditing, setIsEditing] = useState(false);
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 });
  const [lastX, setLastX] = useState(getLastSceneX());
  const [lastY, setLastY] = useState(getLastSceneY());
  const [scale, setScale] = useState(getLastSceneScale());
  const [moveSpeed, setMoveSpeed] = useState(getLastMoveSpeed());
  const selectedEditingComponent = useSelector(selectComponentTree);
  const designResolution = useSelector(selectDesignResolution);
  const isPixi = useSelector(selectIsPixi);
  const filePath = useSelector(selectSelectedEditingPath);
  const rootFolder = useSelector(selectRootFolder);
  const assets = useSelector(selectAssets);
  const componentsCache = useSelector(selectComponentsCache);
  const divRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<any>(null);
  const selectedPaths = useSelector(selectSelectedPaths);
  const selectedNodes = useSelector(selectSelectedNodes)
  const selectedEditingComponentRef = useRef(selectedEditingComponent);

  useEffect(() => {
    selectedEditingComponentRef.current = selectedEditingComponent;
  }, [selectedEditingComponent]);

  useEffect(() => {
    if (!designResolution.width) return;
    const { spriteSheetAssets = [] } = assets;
    if (isPixi) {
      Promise.all(Object.values(spriteSheetAssets).map((spriteSheet) => {
        // console.log('load spriteSheetAssets', spriteSheet)
        return new Promise(resolve => {
          fetch(spriteSheet.value)
            .then(res => res.json())
            .then(data => {
              const baseTex = PIXI.BaseTexture.from(spriteSheet.texture);
              const sheet = new PIXI.Spritesheet(baseTex, data);
              sheet.parse(resolve);
            });
        })
      })).then(() => {
        pixiAppRef.current = createPixiApp(designResolution)
      })
      return
    }
    Object.values(spriteSheetAssets).forEach((spriteSheet) => {
      cc.spriteFrameCache.addSpriteFrames(spriteSheet);
    });
    const timeout = setTimeout(() => {
      cc.game.run({
        debugMode: 1,
        showFPS: true,
        frameRate: 60,
        id: "gameCanvas",
        renderMode: 1
      }, onStart(designResolution));
    }, 50);
    return () => clearTimeout(timeout);
  }, [designResolution]);

  const load = () => {
    const timeout = setTimeout(() => {
      if (isPixi) {
        loadSceneViewPixi(pixiAppRef.current, selectedEditingComponentRef.current, { rootFolder, ...assets, componentsCache, designResolution });
        return
      } else {
        loadSceneViewCocos(selectedEditingComponentRef.current, { rootFolder, ...assets, componentsCache, designResolution });
      }
    }, 250);
    return () => clearTimeout(timeout);
  }

  useEffect(() => {
    return load();
  }, [filePath]);

  useEffect(() => {
    // console.log('listener selectedEditingComponent')
    const listener = event => {
      const message = event.data;
      if (message.type === 'refresh') {
        load()
      }
    }
    window.addEventListener('message', listener);
    return () => {
      // console.log('removeEventListener selectedEditingComponent')
      window.removeEventListener('message', listener)
    }
  }, [selectedEditingComponent]);

  useEffect(() => {
    if (!cc.director?.getRunningScene() && !pixiAppRef.current?.stage) return;
    const scene = isPixi ? pixiAppRef.current.stage : cc.director.getRunningScene()
    const parentNode = scene.children[0];
    selectedPaths.forEach((path, index) => {
      const selectedNode = selectedNodes[index]
      if (!selectedNode.props) return
      const currentNode = getCurrentNode(path, parentNode, selectedEditingComponent[0]?.tag === 'SceneComponent');
      const { x, y } = getNodePosition(selectedNode.props.node);
      currentNode.x = x
      currentNode.y = y
      const { scaleX = 1, scaleY = 1, scale = 1, rotation = 0 } = selectedNode.props.node || {};
      if (scale !== 1) {
        currentNode.scale = isPixi ? new PIXI.Point(scale, scale) : scale;
      }
      if (scaleX !== 1) {
        currentNode.scale.x = scaleX;
      }
      if (scaleY !== 1) {
        currentNode.scale.y = scaleY;
      }
      if (rotation !== 0) {
        currentNode.rotation = rotation;
      }
    })
  }, [selectedPaths, selectedNodes]);

  function onMouseUp() {
    setIsEditing(false);
    if (!cc.director?.getRunningScene() && !pixiAppRef.current?.stage) return;
    const scene = isPixi ? pixiAppRef.current.stage : cc.director.getRunningScene()
    const parentNode = scene.children[0];
    const params = selectedPaths.map((path, index) => {
      const selectedNode = selectedNodes[index]
      if (!selectedNode.props) return {}
      const currentNode = getCurrentNode(path, parentNode, selectedEditingComponent[0]?.tag === 'SceneComponent');
      // console.log('currentNode', currentNode)
      if (selectedNode.props.node?.position) {
        return {
          component: 'props',
          updated: {
            node: {
              ...selectedNode.props.node,
              position: Vec2({
                x: currentNode.x,
                y: currentNode.y,
              })
            }
          }
        }
      } else {
        return {
          component: 'props',
          updated: {
            node: {
              ...selectedNode.props.node,
              xy: [currentNode.x, currentNode.y]
            }
          }
        }
      }
    })
    updateMultiNodes(params)
  }

  function onMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    setIsEditing(true);
    setPositionStart({ x: event.clientX, y: event.clientY });
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = divRef.current?.getBoundingClientRect();
    if (!rect || !selectedEditingComponent || !isEditing) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setPosition({ x, y });
    const scene = isPixi ? pixiAppRef.current.stage : cc.director.getRunningScene()
    const drawLayer = scene.children[0];
    const dx = (event.clientX - positionStart.x) / scale * moveSpeed * (isPixi ? 0.33 : 1);
    const dy = (event.clientY - positionStart.y) / scale * (isPixi ? moveSpeed * 0.33 : -moveSpeed);
    setPositionStart({ x: event.clientX, y: event.clientY });
    // console.log('selectedEditingComponent', selectedEditingComponent, selectedPaths)
    if (!selectedPaths.length) {
      const { x: nx = 0, y: ny = 0 } = drawLayer;
      const lastX = Math.round(nx + dx);
      const lastY = Math.round(ny + dy);
      updateParentNode('x', lastX, setLastX, setLastSceneX);
      updateParentNode('y', lastY, setLastY, setLastSceneY);
      return;
    }
    selectedPaths.forEach((path) => {
      const currentNode = getCurrentNode(path, drawLayer, selectedEditingComponent[0]?.tag === 'SceneComponent');
      const { x: nx = 0, y: ny = 0 } = currentNode;
      currentNode.x = nx + dx
      currentNode.y = ny + dy;
    })
  }

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    let value = scale + (e.deltaY > 0 ? -0.05 : 0.05);
    if (value < 0.1) value = 0.1;
    if (value > 2) value = 2;
    updateParentNode('scale', value, setScale, setLastSceneScale);
    setMoveSpeed(1 / value)
  }, [scale, isPixi]);

  const updateParentNode = useCallback(function (
    key: 'x' | 'y' | 'scale',
    value: number,
    setLast: (v: number) => void,
    setLastScene: (v: number) => void
  ) {
    console.log('updateParentNode', isPixi, key, pixiAppRef.current)
    if (isPixi) {
      const parentNode = pixiAppRef.current.stage.children[0]
      if (key === 'scale') {
        parentNode.scale = new PIXI.Point(value, value);
      } else {
        parentNode[key] = value;
      }
    } else {
      if (!cc.director || !cc.director.getRunningScene()) return;
      const parentNode = getDrawNode();
      parentNode[key] = value;
    }
    setLastScene(value);
    setLast(value);
  }, [isPixi])

  return (
    <div className='w-full h-full'>
      <div className='flex space-x-1 p-1'>
        <NumberInput
          step={0.05}
          label="Scale"
          value={scale}
          min={0.1}
          max={2}
          onChange={(value) => {
            updateParentNode('scale', value, setScale, setLastSceneScale);
            setMoveSpeed(1 / value)
          }}
        />
        <NumberInput
          label="X"
          min={-1000}
          max={1000}
          value={lastX}
          onChange={(value) => {
            updateParentNode('x', value, setLastX, setLastSceneX);
          }}
        />
        <NumberInput
          label="Y"
          min={-1000}
          max={1000}
          value={lastY}
          onChange={(value) => {
            updateParentNode('y', value, setLastY, setLastSceneY);
          }}
        />
        <NumberInput
          label="Move Speed"
          min={0.1}
          max={20}
          step={0.1}
          value={moveSpeed}
          onChange={(value) => {
            setMoveSpeed(value)
            setLastMoveSpeed(value)
          }}
        />
      </div>
      <hr />
      <div
        ref={divRef}
        onMouseUp={onMouseUp}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onWheel={handleWheel}
        className='w-full h-full relative'
      >
        <canvas id='gameCanvas' className='pointer-events-none' />
        <ArrowControl position={position} />
      </div>
    </div>
  );
}
