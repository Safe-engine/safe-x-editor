import NumberInput from 'base/NumberInput';
import { getLastSceneScale, getLastSceneX, getLastSceneY, setLastSceneScale, setLastSceneX, setLastSceneY } from 'data/AppData';
import { parseVec2, Vec2 } from 'helper/node';
import { parseInt } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { updateEditingComponent } from 'states/app.action';
import { useDispatch, useSelector } from 'states/app.context';
import { selectAssets, selectComponentTree, selectDesignResolution, selectRootFolder, selectSelectedEditingClassNamePath, selectSelectedFilePath, selectSelectedNode } from 'states/app.selectors';
import ArrowControl from './ArrowControl';
import { onStart } from './cocos';
import { loadSceneView } from './loader';

function getCurrentNode(editingClassNamePath: string, parentNode: any) {
  const childrenIndex = editingClassNamePath.split('.')[0].split('-').map(parseInt);
  childrenIndex.shift();
  let currentNode = parentNode;
  childrenIndex.forEach((index) => {
    if (currentNode.children[index])
      currentNode = currentNode.children[index];
  });
  return currentNode;
}

export default function SceneView() {
  const dispatch = useDispatch();
  const [position, setPosition] = useState({ x: 200, y: 200 })
  const [isEditing, setIsEditing] = useState(false);
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 });
  const [lastX, setLastX] = useState(getLastSceneX())
  const [lastY, setLastY] = useState(getLastSceneY())
  const [scale, setScale] = useState(getLastSceneScale())
  const selectedEditingComponent = useSelector(selectComponentTree);
  const designResolution = useSelector(selectDesignResolution);
  const selectedNode = useSelector(selectSelectedNode);
  const filePath = useSelector(selectSelectedFilePath);
  const rootFolder = useSelector(selectRootFolder);
  const assets = useSelector(selectAssets);
  const divRef = useRef<HTMLDivElement>(null)
  const editingClassNamePath = useSelector(selectSelectedEditingClassNamePath);

  useEffect(() => {
    if (!designResolution.width) return
    const { spriteSheetAssets = [] } = assets
    Object.values(spriteSheetAssets).forEach((spriteSheet) => {
      cc.spriteFrameCache.addSpriteFrames(spriteSheet)
    })
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
    loadSceneView(selectedEditingComponent, { rootFolder, ...assets });
  }, [filePath]);

  useEffect(() => {
    if (!cc.director || !cc.director.getRunningScene() || !selectedNode.props) return;
    const parentNode = cc.director.getRunningScene().children[0];
    const currentNode = getCurrentNode(editingClassNamePath, parentNode);
    const { x, y } = parseVec2(selectedNode.props.node.position);
    currentNode.setPosition(x, y);
  }, [editingClassNamePath, selectedNode]);

  function onMouseUp() {
    setIsEditing(false);
    if (!cc.director || !cc.director.getRunningScene() || !selectedNode.props) return;
    const parentNode = cc.director.getRunningScene().children[0];
    const currentNode = getCurrentNode(editingClassNamePath, parentNode);
    dispatch(updateEditingComponent('props', {
      node: {
        ...selectedNode.props.node,
        position: Vec2({
          x: currentNode.x,
          y: currentNode.y,
        })
      }
    }));
  }

  function onMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    setIsEditing(true);
    setPositionStart({ x: event.clientX, y: event.clientY });
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = divRef.current?.getBoundingClientRect();
    if (!rect || !isEditing) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setPosition({ x, y });
    const drawLayer = cc.director.getRunningScene().children[0];
    const dx = (event.clientX - positionStart.x) * 2.4;
    const dy = (event.clientY - positionStart.y) * -2.4;
    setPositionStart({ x: event.clientX, y: event.clientY });
    if (!selectedEditingComponent || !selectedNode.props) {
      const { x: nx = 0, y: ny = 0 } = drawLayer.getPosition();
      const lastX = Math.round(nx + dx)
      const lastY = Math.round(ny + dy)
      drawLayer.setPosition(lastX, lastY);
      setLastSceneX(lastX)
      setLastSceneY(lastY)
      setLastX(lastX)
      setLastY(lastY)
      return;
    }
    const currentNode = getCurrentNode(editingClassNamePath, drawLayer);
    const { x: nx = 0, y: ny = 0 } = currentNode.getPosition();
    currentNode.setPosition(nx + dx, ny + dy);
  }

  const handleWheel = useCallback((e) => {
    // console.log("Delta Y:", e.deltaY);
    if (!cc.director || !cc.director.getRunningScene()) return;
    const parentNode = cc.director.getRunningScene().children[0];
    const value = scale + (e.deltaY > 0 ? -0.05 : 0.05)
    // console.log('Scale', scale, value, parentNode)
    if (value < 0.1 || value > 2) return
    parentNode.scale = value
    setLastSceneScale(value)
    setScale(value)
  }, [scale]);

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
            if (!cc.director || !cc.director.getRunningScene()) return;
            const parentNode = cc.director.getRunningScene().children[0];
            console.log('Scale', value, parentNode)
            parentNode.scale = value
            setLastSceneScale(value)
            setScale(value)
          }}
        />
        <NumberInput
          label="X"
          min={-1000}
          max={1000}
          value={lastX}
          onChange={(value) => {
            if (!cc.director || !cc.director.getRunningScene()) return;
            const parentNode = cc.director.getRunningScene().children[0];
            parentNode.x = value
            setLastSceneX(value)
            setLastX(value)
          }}
        />
        <NumberInput
          label="Y"
          min={-1000}
          max={1000}
          value={lastY}
          onChange={(value) => {
            if (!cc.director || !cc.director.getRunningScene()) return;
            const parentNode = cc.director.getRunningScene().children[0];
            parentNode.y = value
            setLastSceneY(value)
            setLastY(value)
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
        className='select-none w-full h-full'
      >
        <canvas id='gameCanvas' className='pointer-events-none' />
        <ArrowControl position={position} />
      </div>
    </div>
  );
}
