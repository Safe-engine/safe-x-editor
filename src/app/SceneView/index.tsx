import { useContext, useEffect, useRef, useState } from 'react';
import { updateEditingComponent } from 'states/app.action';
import { AppContext } from 'states/app.context';
import { selectAssetsTextureList, selectComponentTree, selectFontAssets, selectRootFolder, selectSelectedEditingClassNamePath, selectSelectedEditingPath, selectSelectedFilePath, selectSelectedNode } from 'states/app.selectors';
import { onStart } from './cocos';
import { loadSceneView } from './loader';

export default function SceneView() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const selectedEditingComponent = useSelector(selectComponentTree);
  const selectedNode = useSelector(selectSelectedNode);
  const filePath = useSelector(selectSelectedFilePath);
  const rootFolder = useSelector(selectRootFolder);
  const assetsTextureList = useSelector(selectAssetsTextureList);
  const fontAssets = useSelector(selectFontAssets);
  const divRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const treeData = useSelector(selectSelectedEditingPath);
  const editingClassNamePath = useSelector(selectSelectedEditingClassNamePath);
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const timeout = setTimeout(() => {
      // if (!divRef.current) return;
      cc.game.run({
        debugMode: 1,
        showFPS: true,
        frameRate: 60,
        id: "gameCanvas",
        renderMode: 1
      }, onStart);
    }, 110); // Đợi 1 tick để DOM gắn xong

    return () => clearTimeout(timeout);
  }, []); // Chạy 1 lần khi component đã mount

  useEffect(() => {
    console.log('SceneView isEditing', selectedEditingComponent)
    loadSceneView(selectedEditingComponent, { rootFolder, assetsTextureList, fontAssets })
  }, [filePath]);

  useEffect(() => {
    if (!cc.director || !cc.director.getRunningScene()) return
    const parentNode = cc.director.getRunningScene().children[0]
    const childrenIndex = editingClassNamePath.split('.')[0].split('-')
    let currentNode = parentNode
    childrenIndex.forEach(child => {
      currentNode = currentNode.children[child]
    })
    // currentNode.x = selectSelectedNode
    console.log('selectedNode', currentNode, selectedNode)

  }, [selectedNode])

  function onMouseUp() {
    setIsEditing(false)
  }
  function onMouseDown(event) {
    setIsEditing(true)
    setPositionStart({ x: event.clientX, y: event.clientY })
  }
  function onMouseMove(event) {
    const x = event.clientX - divRef.current.getBoundingClientRect().left
    const y = event.clientY - divRef.current.getBoundingClientRect().top
    // console.log('Mouse move:', positionStart, isEditing)
    setPosition({ x, y })
    if (!selectedEditingComponent || !isEditing) return
    const { node = {} } = selectedEditingComponent[0].props
    const { x: nx = 0, y: ny = 0 } = node
    dispatch(updateEditingComponent('props', {
      node: {
        ...node,
        x: nx + event.clientX - positionStart.x,
        y: ny + event.clientY - positionStart.y,
      }
    }));
  }
  // Necessary because we will have to use Greet as a component later.
  return <div ref={divRef}
    onMouseUp={onMouseUp}
    onMouseDown={onMouseDown}
    onMouseMove={onMouseMove}
    className='select-none w-full h-full' >
    {/* <iframe className='w-full' style={{ height: '50vh' }} src='http://localhost:10234' /> */}
    <canvas id='gameCanvas' />
    {/* <ArrowControl position={position} /> */}
  </div>
}
