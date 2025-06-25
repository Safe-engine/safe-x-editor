import NumberInput from 'base/NumberInput';
import { getLastSceneScale, getLastSceneX, getLastSceneY, setLastSceneScale, setLastSceneX, setLastSceneY } from 'data/AppData';
import { parseVec2, Vec2 } from 'helper/node';
import { parseInt } from 'lodash';
import { useEffect, useRef, useState } from 'react';
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
  childrenIndex.forEach((child, i) => {
    const index = i === 0 ? child + 1 : child;
    if (currentNode.children[index]) currentNode = currentNode.children[index];
  });
  return currentNode;
}

export default function SceneView() {
  const [position, setPosition] = useState({ x: 200, y: 200 })
  const [isEditing, setIsEditing] = useState(false);
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 });
  const dispatch = useDispatch();
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
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setPosition({ x, y });
    if (!selectedEditingComponent || !isEditing || !selectedNode.props) return;
    const parentNode = cc.director.getRunningScene().children[0];
    const currentNode = getCurrentNode(editingClassNamePath, parentNode);
    const { x: nx = 0, y: ny = 0 } = currentNode.getPosition();
    const dx = (event.clientX - positionStart.x) * 2.4;
    const dy = (event.clientY - positionStart.y) * -2.4;
    currentNode.setPosition(nx + dx, ny + dy);
    setPositionStart({ x: event.clientX, y: event.clientY });
  }

  return (
    <div className='select-none w-full h-full'>
      <div className='flex space-x-1 p-1'>
        <NumberInput
          step={0.05}
          label="Scale"
          defaultValue={getLastSceneScale()}
          min={0.1}
          max={2}
          onChange={(value) => {
            if (!cc.director || !cc.director.getRunningScene()) return;
            const parentNode = cc.director.getRunningScene().children[0];
            console.log('Scale', value, parentNode)
            parentNode.scale = value
            setLastSceneScale(value)
          }}
        />
        <NumberInput
          label="X"
          min={-1000}
          max={1000}
          defaultValue={getLastSceneX()}
          onChange={(value) => {
            if (!cc.director || !cc.director.getRunningScene()) return;
            const parentNode = cc.director.getRunningScene().children[0];
            parentNode.x = value
            setLastSceneX(value)
          }}
        />
        <NumberInput
          label="Y"
          min={-1000}
          max={1000}
          defaultValue={getLastSceneY()}
          onChange={(value) => {
            if (!cc.director || !cc.director.getRunningScene()) return;
            const parentNode = cc.director.getRunningScene().children[0];
            parentNode.y = value
            setLastSceneY(value)
          }}
        />
      </div>
      <hr />
      <div
        ref={divRef}
        onMouseUp={onMouseUp}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        className='select-none w-full h-full'
      >
        <canvas id='gameCanvas' />
      </div>
      <ArrowControl position={position} />
    </div>
  );
}
