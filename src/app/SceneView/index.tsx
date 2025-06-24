import { parseVec2, Vec2 } from 'helper/node';
import { parseInt } from 'lodash';
import { useContext, useEffect, useRef, useState } from 'react';
import { updateEditingComponent } from 'states/app.action';
import { AppContext } from 'states/app.context';
import { selectAssetsTextureList, selectComponentTree, selectFontAssets, selectRootFolder, selectSelectedEditingClassNamePath, selectSelectedFilePath, selectSelectedNode } from 'states/app.selectors';
import ArrowControl from './ArrowControl';
import { onStart } from './cocos';
import { loadSceneView } from './loader';

let isEditing = false
let positionStart = { x: 0, y: 0 }

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
  // const [isEditing, setIsEditing] = useState(false)
  const editingClassNamePath = useSelector(selectSelectedEditingClassNamePath);
  // const [positionStart, setPositionStart] = useState({ x: 0, y: 0 })

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
    }, 50); // Đợi 1 tick để DOM gắn xong

    return () => clearTimeout(timeout);
  }, []); // Chạy 1 lần khi component đã mount

  useEffect(() => {
    console.log('SceneView isEditing', selectedEditingComponent)
    loadSceneView(selectedEditingComponent, { rootFolder, assetsTextureList, fontAssets })
  }, [filePath]);

  useEffect(() => {
    if (!cc.director || !cc.director.getRunningScene() || !selectedNode.props) return
    const parentNode = cc.director.getRunningScene().children[0]
    const childrenIndex = editingClassNamePath.split('.')[0].split('-').map(parseInt)
    childrenIndex.shift()
    // console.log('editingClassNamePath', childrenIndex, editingClassNamePath)
    let currentNode = parentNode
    childrenIndex.forEach((child, i) => {
      const index = i === 0 ? child + 1 : child
      // console.log('selectedNode', child, i, index, currentNode)
      // console.log('currentNode.children', currentNode.children)
      if (currentNode.children[index])
        currentNode = currentNode.children[index]
    })
    const { x, y } = parseVec2(selectedNode.props.node.position)
    currentNode.setPosition(x, y)
    // console.log('selectedNode', currentNode, selectedNode)
  }, [editingClassNamePath, selectedNode])

  function onMouseUp() {
    // setIsEditing(false)
    isEditing = false
    const parentNode = cc.director.getRunningScene().children[0]
    const childrenIndex = editingClassNamePath.split('.')[0].split('-').map(parseInt)
    childrenIndex.shift()
    // console.log('editingClassNamePath', childrenIndex, editingClassNamePath)
    let currentNode = parentNode
    childrenIndex.forEach((child, i) => {
      const index = i === 0 ? child + 1 : child
      // console.log('selectedNode', child, i, index, currentNode)
      // console.log('currentNode.children', currentNode.children)
      if (currentNode.children[index])
        currentNode = currentNode.children[index]
    })
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
  function onMouseDown(event) {
    // setIsEditing(true)
    // setPositionStart({ x: event.clientX, y: event.clientY })
    isEditing = true
    positionStart = { x: event.clientX, y: event.clientY }
  }
  function onMouseMove(event) {
    const x = event.clientX - divRef.current.getBoundingClientRect().left
    const y = event.clientY - divRef.current.getBoundingClientRect().top
    setPosition({ x, y })
    if (!selectedEditingComponent || !isEditing || !selectedNode.props) return
    // console.log('Mouse move:', positionStart, isEditing)
    // console.log('event.client:', event.clientX, event.clientY)
    {
      const parentNode = cc.director.getRunningScene().children[0]
      const childrenIndex = editingClassNamePath.split('.')[0].split('-').map(parseInt)
      childrenIndex.shift()
      // console.log('editingClassNamePath', childrenIndex, editingClassNamePath)
      let currentNode = parentNode
      childrenIndex.forEach((child, i) => {
        const index = i === 0 ? child + 1 : child
        // console.log('selectedNode', child, i, index, currentNode)
        // console.log('currentNode.children', currentNode.children)
        if (currentNode.children[index])
          currentNode = currentNode.children[index]
      })
      // const { x, y } = parseVec2(selectedNode.props.node.position)
      const { x: nx = 0, y: ny = 0 } = currentNode.getPosition()
      const x = nx + (event.clientX - positionStart.x) * 2.4
      const y = ny + (event.clientY - positionStart.y) * -2.4
      currentNode.setPosition(x, y)
    }
    positionStart = { x: event.clientX, y: event.clientY }
  }
  // Necessary because we will have to use Greet as a component later.
  return <div ref={divRef}
    onMouseUp={onMouseUp}
    onMouseDown={onMouseDown}
    onMouseMove={onMouseMove}
    className='select-none w-full h-full' >
    <canvas id='gameCanvas' />
    <ArrowControl position={position} />
  </div>
}
