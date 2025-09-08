import clsx from 'clsx';
import { round } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import Input from '../../base/Input';
import { getLastMoveSpeed, getLastSceneScale, getLastSceneX, getLastSceneY, setLastMoveSpeed, setLastSceneScale, setLastSceneX, setLastSceneY } from '../../data/AppData';
import { getCurrentNode, getNodePosition, Vec2 } from '../../helper/node';
import { handleChangeNumber } from '../../helper/utils';
import { useActions, useSelector } from '../../states/app.context';
import { selectAssets, selectComponentsCache, selectComponentTree, selectDesignResolution, selectIsPixi, selectRootFolder, selectSelectedEditingPath, selectSelectedNodes, selectSelectedPaths } from '../../states/app.selectors';
import { getArrowNode, getDrawNode, getHorizonArrow, getVerticalArrow, loadSceneViewCocos, onStart } from './cocos';
import { createPixiApp, loadSceneViewPixi } from './pixi';
declare let PIXI: any

export default function SceneView() {
  const { updateMultiNodes, deleteNodes } = useActions();
  // const [position, setPosition] = useState({ x: 200, y: 200 });
  const [isEditing, setIsEditing] = useState(false);
  const [isMiddleMouse, setIsMiddleMouse] = useState(false);
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 });
  const [lastX, setLastX] = useState(getLastSceneX());
  const [lastY, setLastY] = useState(getLastSceneY());
  const [lockX, setLockX] = useState(false);
  const [lockY, setLockY] = useState(false);
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
    if (isPixi) {
      if (!pixiAppRef.current?.stage) return;
      const arrowNode = pixiAppRef.current.stage.children[1]
      const horizonArrow = arrowNode.children[0];
      horizonArrow.alpha = lockX ? 0.2 : 1;
      return
    }
    if (!cc.director?.getRunningScene()) return;
    getHorizonArrow().opacity = lockX ? 50 : 255
  }, [lockX])

  useEffect(() => {
    if (isPixi) {
      if (!pixiAppRef.current?.stage) return;
      const arrowNode = pixiAppRef.current.stage.children[1]
      const verticalArrow = arrowNode.children[1];
      verticalArrow.alpha = lockY ? 0.2 : 1;
      return
    }
    if (!cc.director?.getRunningScene()) return;
    // getVerticalArrow().color = lockY ? cc.color(0, 0, 0, 0) : cc.color(255, 0, 0, 255)
    getVerticalArrow().opacity = lockY ? 50 : 255
  }, [lockY])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'x' || e.key === 'X') {
        setLockX(!lockX);
      }
      if (e.key === 'y' || e.key === 'Y') {
        setLockY(!lockY);
      }
      // check arrow key and move
      let value = 1
      if (e.shiftKey) {
        value = 10
      }
      // e.preventDefault();
      console.log('onKeyDown', e.key, value)
      switch (e.key) {
        case 'ArrowUp':
          if (isPixi) {
            value = value * -1
          }
          if (!lockY) updateNodes(0, value);
          break;
        case 'ArrowDown':
          if (isPixi) {
            value = value * -1
          }
          if (!lockY) updateNodes(0, -value);
          break;
        case 'ArrowLeft':
          if (!lockX) updateNodes(-value, 0);
          break;
        case 'ArrowRight':
          if (!lockX) updateNodes(value, 0);
          break;
        case 'Delete':
        case 'Backspace':
          deleteNodes();
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    }
  }, [lockX, lockY])

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
    let arrowNode
    if (isPixi) {
      arrowNode = pixiAppRef.current.stage.children[1]
    } else {
      arrowNode = getArrowNode()
    }
    if (!selectedPaths.length) {
      setLastX(getLastSceneX());
      setLastY(getLastSceneY());
      arrowNode.x = -1000;
      arrowNode.y = -1000;
      return
    }
    const scene = isPixi ? pixiAppRef.current.stage : cc.director.getRunningScene()
    const parentNode = scene.children[0];
    selectedPaths.forEach((path, index) => {
      const selectedNode = selectedNodes[index]
      if (!selectedNode.props) return
      const currentNode = getCurrentNode(path, parentNode, selectedEditingComponent[0]?.tag === 'SceneComponent');
      const { x, y } = getNodePosition(selectedNode.props.node);
      currentNode.x = x
      currentNode.y = y
      setLastX(x);
      setLastY(y);
      if (isPixi) {
        const globalPos = currentNode.getGlobalPosition();
        arrowNode.x = globalPos.x;
        arrowNode.y = globalPos.y;
      } else {
        const worldPosition = currentNode.parent.convertToWorldSpace(currentNode);
        const { x, y } = worldPosition;
        // console.log('worldPosition', currentNode.x, currentNode.y, worldPosition)
        arrowNode.setPosition(x, y);
      }
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
  }, [selectedPaths, selectedNodes, scale]);

  function onMouseUp() {
    if (isMiddleMouse) {
      setIsMiddleMouse(false);
    }
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
    if (event.button === 1) {
      setIsMiddleMouse(true);
    }
    setIsEditing(true);
    setPositionStart({ x: event.clientX, y: event.clientY });
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = divRef.current?.getBoundingClientRect();
    if (!rect || !selectedEditingComponent || !isEditing) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    // setPosition({ x, y });
    const scene = isPixi ? pixiAppRef.current.stage : cc.director.getRunningScene()
    const drawLayer = scene.children[0];
    const dx = (event.clientX - positionStart.x) / scale * moveSpeed * (isPixi ? 0.33 : 1);
    const dy = (event.clientY - positionStart.y) / scale * (isPixi ? moveSpeed * 0.33 : -moveSpeed);
    setPositionStart({ x: event.clientX, y: event.clientY });
    // console.log('selectedEditingComponent', selectedEditingComponent, selectedPaths)
    if (!selectedPaths.length || isMiddleMouse) {
      const { x: nx = 0, y: ny = 0 } = drawLayer;
      const lastX = round(nx + dx);
      const lastY = round(ny + dy);
      updateParentNode('x', lastX, setLastX, setLastSceneX);
      updateParentNode('y', lastY, setLastY, setLastSceneY);
      if (isPixi) {
        const globalPos = pixiAppRef.current.stage.children[0].getGlobalPosition();
        const arrowNode = pixiAppRef.current.stage.children[1]
        arrowNode.x = globalPos.x;
        arrowNode.y = globalPos.y;
      } else {
        const worldPosition = getDrawNode().convertToWorldSpace(cc.p(0, 0));
        const { x, y } = worldPosition;
        getArrowNode().setPosition(x, y);
      }
      return;
    }
    updateNodes(dx, dy);
  }

  function updateNodes(dx, dy) {
    if (!selectedEditingComponent) return;
    const scene = isPixi ? pixiAppRef.current.stage : cc.director.getRunningScene()
    const drawLayer = scene.children[0];
    selectedPaths.forEach((path) => {
      const currentNode = getCurrentNode(path, drawLayer, selectedEditingComponent[0]?.tag === 'SceneComponent');
      const { x: nx = 0, y: ny = 0 } = currentNode;
      if (!lockX) {
        currentNode.x = round(nx + dx)
        setLastX(currentNode.x);
      }
      if (!lockY) {
        currentNode.y = round(ny + dy);
        setLastY(currentNode.y);
      }
      if (isPixi) {
        const globalPos = currentNode.getGlobalPosition();
        const arrowNode = pixiAppRef.current.stage.children[1]
        arrowNode.x = globalPos.x;
        arrowNode.y = globalPos.y;
      } else {
        const worldPosition = currentNode.parent.convertToWorldSpace(currentNode);
        const { x, y } = worldPosition;
        // console.log('worldPosition', currentNode.x, currentNode.y, worldPosition)
        getArrowNode().setPosition(x, y);
      }
    })
  }

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    let value = scale + (e.deltaY > 0 ? -0.05 : 0.05);
    if (value < 0.1) value = 0.1;
    if (value > 2) value = 2;
    updateParentNode('scale', round(value, 2), setScale, setLastSceneScale);
    setMoveSpeed(round(1 / value, 2));
    setLastMoveSpeed(round(1 / value, 2));
  }, [scale, isPixi]);

  const updateParentNode = useCallback(function (
    key: 'x' | 'y' | 'scale',
    value: number,
    setLast: (v: number) => void,
    setLastScene: (v: number) => void
  ) {
    // console.log('updateParentNode', isPixi, key, pixiAppRef.current)
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

  useEffect(() => {
    if (!selectedPaths.length) {
      updateParentNode('x', lastX, setLastX, setLastSceneX);
      return
    }
  }, [lastX])

  useEffect(() => {
    if (!selectedPaths.length) {
      updateParentNode('y', lastY, setLastY, setLastSceneY);
      return
    }
  }, [lastY])

  useEffect(() => {
    if (!selectedPaths.length) {
      updateParentNode('scale', scale, setScale, setLastSceneScale);
      return
    }
  }, [scale])

  useEffect(() => {
    setLastMoveSpeed(moveSpeed);
  }, [moveSpeed])

  return (
    <div className='w-full h-full'>
      <div className='inline-block space-x-1 p-1 text-white items-center justify-start'>
        <span className={clsx('cursor-pointer select-none', { 'line-through decoration-red-500 decoration-2': lockX })}
          onClick={() => setLockX(!lockX)}
        >X:</span>
        <Input
          readOnly={lockX}
          value={lastX}
          onChange={handleChangeNumber(setLastX)}
        />
        <span className={clsx('cursor-pointer select-none', { 'line-through decoration-red-500 decoration-2': lockY })}
          onClick={() => setLockY(!lockY)}
        >Y:</span>
        <Input
          readOnly={lockY}
          value={lastY}
          onChange={handleChangeNumber(setLastY)}
        />
        Scale:<Input
          value={scale}
          onChange={handleChangeNumber(setScale)}
        />
        Move Speed:<Input
          className='w-16'
          value={moveSpeed}
          onChange={handleChangeNumber(setMoveSpeed)}
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
      </div>
    </div>
  );
}
