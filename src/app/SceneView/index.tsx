import NumberInput from 'base/NumberInput';
import { getLastSceneScale, getLastSceneX, getLastSceneY, setLastSceneScale, setLastSceneX, setLastSceneY } from 'data/AppData';
import { getNodePosition, Vec2 } from 'helper/node';
import { parseInt } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useActions, useSelector } from 'states/app.context';
import { selectAssets, selectComponentTree, selectDesignResolution, selectRootFolder, selectSelectedEditingClassNamePath, selectSelectedFilePath, selectSelectedNode } from 'states/app.selectors';
import ArrowControl from './ArrowControl';
import { onStart } from './cocos';
import { loadSceneView } from './loader';

function getCurrentNode(editingClassNamePath: string, parentNode: any, isSceneNode: boolean) {
  const childrenIndex = editingClassNamePath.split('.')[0].split('-').map(parseInt);
  if (isSceneNode)
    childrenIndex.shift();
  let currentNode = parentNode;
  childrenIndex.forEach((child, i) => {
    const index = i === 0 ? child + 1 : child;
    if (currentNode.children[index])
      currentNode = currentNode.children[index];
  });
  return currentNode;
}

export default function SceneView() {
  const { updateEditingComponent } = useActions();
  const [position, setPosition] = useState({ x: 200, y: 200 });
  const [isEditing, setIsEditing] = useState(false);
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 });
  const [lastX, setLastX] = useState(getLastSceneX());
  const [lastY, setLastY] = useState(getLastSceneY());
  const [scale, setScale] = useState(getLastSceneScale());
  const selectedEditingComponent = useSelector(selectComponentTree);
  const designResolution = useSelector(selectDesignResolution);
  const selectedNode = useSelector(selectSelectedNode);
  const filePath = useSelector(selectSelectedFilePath);
  const rootFolder = useSelector(selectRootFolder);
  const assets = useSelector(selectAssets);
  const divRef = useRef<HTMLDivElement>(null);
  const editingClassNamePath = useSelector(selectSelectedEditingClassNamePath);

  useEffect(() => {
    if (!designResolution.width) return;
    const { spriteSheetAssets = [] } = assets;
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

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadSceneView(selectedEditingComponent, { rootFolder, ...assets });
    }, 150);
    return () => clearTimeout(timeout);
  }, [filePath]);

  useEffect(() => {
    if (!cc.director || !cc.director.getRunningScene() || !selectedNode.props) return;
    const parentNode = cc.director.getRunningScene().children[0];
    const currentNode = getCurrentNode(editingClassNamePath, parentNode, selectedEditingComponent[0]?.tag === 'SceneComponent');
    const { x, y } = getNodePosition(selectedNode.props.node);
    currentNode.setPosition(x, y);
    const { scaleX = 1, scaleY = 1, scale = 1, rotation = 0 } = selectedNode.props.node || {};
    if (scale !== 1) {
      currentNode.scale = scale;
    }
    if (scaleX !== 1) {
      currentNode.scaleX = scaleX;
    }
    if (scaleY !== 1) {
      currentNode.scaleY = scaleY;
    }
    if (rotation !== 0) {
      currentNode.rotation = rotation;
    }
  }, [editingClassNamePath, selectedNode]);

  function onMouseUp() {
    setIsEditing(false);
    if (!cc.director || !cc.director.getRunningScene() || !selectedNode.props) return;
    const parentNode = cc.director.getRunningScene().children[0];
    const currentNode = getCurrentNode(editingClassNamePath, parentNode, selectedEditingComponent[0]?.tag === 'SceneComponent');
    console.log('currentNode', currentNode)
    if (selectedNode.props.node?.position) {
      updateEditingComponent('props', {
        node: {
          ...selectedNode.props.node,
          position: Vec2({
            x: currentNode.x,
            y: currentNode.y,
          })
        }
      });
    } else {
      updateEditingComponent('props', {
        node: {
          ...selectedNode.props.node,
          xy: [currentNode.x, currentNode.y]
        }
      });
    }
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
    const drawLayer = cc.director.getRunningScene().children[0];
    const dx = (event.clientX - positionStart.x) / scale * 1.5;
    const dy = (event.clientY - positionStart.y) / -scale * 1.5;
    setPositionStart({ x: event.clientX, y: event.clientY });
    // console.log('selectedEditingComponent', selectedEditingComponent, selectedNode)
    if (!selectedNode.props) {
      const { x: nx = 0, y: ny = 0 } = drawLayer.getPosition();
      const lastX = Math.round(nx + dx);
      const lastY = Math.round(ny + dy);
      updateParentNode('x', lastX, setLastX, setLastSceneX);
      updateParentNode('y', lastY, setLastY, setLastSceneY);
      return;
    }
    const currentNode = getCurrentNode(editingClassNamePath, drawLayer, selectedEditingComponent[0]?.tag === 'SceneComponent');
    const { x: nx = 0, y: ny = 0 } = currentNode.getPosition();
    currentNode.setPosition(nx + dx, ny + dy);
  }

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const value = scale + (e.deltaY > 0 ? -0.05 : 0.05);
    if (value < 0.1 || value > 2) return;
    updateParentNode('scale', value, setScale, setLastSceneScale);
  }, [scale]);

  function updateParentNode(
    key: 'x' | 'y' | 'scale',
    value: number,
    setLast: (v: number) => void,
    setLastScene: (v: number) => void
  ) {
    if (!cc.director || !cc.director.getRunningScene()) return;
    const parentNode = cc.director.getRunningScene().children[0];
    parentNode[key] = value;
    setLastScene(value);
    setLast(value);
  }

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
