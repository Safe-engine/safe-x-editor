import { default as Tree } from '@colin-luo/tree';
import snakeCase from 'lodash/snakeCase';
import { Dispatch } from 'react';
import { AppState } from './app.reducer';

const undoStack = []
const redoStack = []

export function undoEdit(actions) {
  const prev = undoStack.pop();
  if (!prev) return;
  const { name, data } = prev;
  if (name && actions[name]) {
    actions[name](...data);
  }
}

export function redoEdit(actions) {
  const next = redoStack.pop();
  if (!next) return;
  if (next.name && actions[next.name]) {
    actions[next.name](next.data);
  }
}

export function getAction(draft: AppState) {
  const actions = {
    getFiles(src: string) {
      draft.rootFolder = src.replace(/\\/g, '/')
    },
    getFilesSuccess(data) {
      const { imagesTree, componentsTree, componentsCache, assets, designedResolution, isPixi } = data
      draft.filesData = componentsTree[0].children
      draft.assets = assets
      draft.imagesTree = imagesTree[0] ? imagesTree[0].children : []
      draft.componentsCache = componentsCache
      draft.settings.designedResolution = designedResolution
      draft.isPixi = isPixi
    },
    loadComponent(path: string) {
      // if (draft.filePath !== path)
      draft.filePath = path
    },
    loadComponentSuccess(data) {
      const { treeData, name } = data
      draft.componentTree = [treeData]
      draft.componentPropTypes = draft.componentTree[0].props
      draft.editingClassNamePath = ''
      draft.editingPath = name
      draft.componentsCache[name] = treeData
    },
    selectEditingTagNode(path: string) {
      draft.editingClassNamePath = path
      const tree = new Tree(draft.componentTree, 'id', 'children')
      const node = tree.getNode(draft.editingClassNamePath)
      if (node && node.props) {
        draft.componentPropTypes = node.props
      }
    },
    updateEditingComponent(component: string, updated: any) {
      const tree = new Tree(draft.componentTree, 'id', 'children')
      const node = tree.getNode(draft.editingClassNamePath)
      if (node) {
        node[component] = { ...node[component], ...updated }
      }
    },
    toggleFolder(key: string) {
      let tree = new Tree(draft.imagesTree, 'path', 'children')
      const node = tree.getNode(key)
      console.log(key, 'toggleFolder', node.isOpen)
      node.expanded = !node.expanded
    },
    selectEditMultiNodes(paths: string[]) {
      draft.selectedPaths = paths
      const tree = new Tree(draft.componentTree, 'id', 'children')
      draft.selectedNodes = paths.map((p) => tree.getNode(p))
    },
    updateMultiNodes(params: Array<{ component?: string; updated?: any }>) {
      const tree = new Tree(draft.componentTree, 'id', 'children')
      params.forEach((param, index) => {
        const { component, updated } = param
        if (!component) return
        const path = draft.selectedPaths[index]
        const node = tree.getNode(path)
        if (node) {
          const { xy } = node[component].node
          undoStack.push({ name: 'undo', data: [draft.selectedPaths[0], component, { node: { xy: [...xy] } }] });
          // console.log('updateMultiNodes middleware', current(node[component]), current(xy))
          node[component] = { ...node[component], ...updated }
          draft.selectedNodes[index] = node
        }
      })
    },
    undo(nodePath: string, component: string, updated: any) {
      // console.log('undo', nodePath, component, updated)
      const tree = new Tree(draft.componentTree, 'id', 'children')
      const node = tree.getNode(nodePath)
      // console.log('node', current(node))
      if (node) {
        const { xy } = node[component].node
        redoStack.push({ name: 'redo', data: [draft.selectedPaths[0], component, { node: { xy: [...xy] } }] });
        node[component] = { ...node[component], ...updated }
        window.postMessage({ type: 'refresh' })
      }
    },
    redo(nodePath: string, component: string, updated: any) {
      // console.log('undo', nodePath, component, updated)
      const tree = new Tree(draft.componentTree, 'id', 'children')
      const node = tree.getNode(nodePath)
      // console.log('node', current(node))
      if (node) {
        const { xy } = node[component].node
        undoStack.push({ name: 'undo', data: [draft.selectedPaths[0], component, { node: { xy: [...xy] } }] });
        node[component] = { ...node[component], ...updated }
        window.postMessage({ type: 'refresh' })
      }
    },
    setDragNode(path: string) {
      draft.dragNodePath = path
    },
    createNode(parentPath?: string) {
      if (!draft.dragNodePath) return
      const tree = new Tree(draft.componentTree, 'id', 'children')
      let parentNode = tree.getNode(parentPath)
      const type = draft.dragNodePath.split('/').pop().split('.')[0];
      const key = snakeCase(type).toLowerCase();
      const newNode = {
        id: '',
        "expanded": true,
        "tag": "SpriteRender",
        "props": { "spriteFrame": `{sf_${key}}`, node: { xy: [0, 0] } },
        "components": [],
        "children": []
      }
      if (parentNode) {
        // console.log('createNode parentNode', current(parentNode))
        if (!parentNode.children) parentNode.children = []
        const id = parentNode.id + '-' + parentNode.children.length
        newNode.id = id
        if (parentNode.props?.spriteFrame) {
          const key = parentNode.props.spriteFrame.match(/\{(.+?)\}/)?.[1]
          const parentSf = draft.assets.assetsTextureList.find(a => a.key === key)
          // console.log('createNode parentSf', key)
          if (parentSf) {
            // console.log('createNode parentSf', current(parentSf))
            const { width, height } = parentSf.size
            newNode.props.node.xy = [width * 0.5, height * 0.5]
          }
        }
      } else {
        const newId = '0-' + draft.componentTree[0].children.length
        newNode.id = newId
        const { width, height } = draft.settings.designedResolution
        newNode.props.node.xy = [width * 0.5, height * 0.5]
        parentNode = draft.componentTree[0]
      }
      parentNode.children.push(newNode)
      draft.dragNodePath = ''
      window.postMessage({ type: 'refresh' })
    },
  }
  return actions
}

export type Actions = ReturnType<typeof getAction>

export function createActions(appDispatch: Dispatch<any>) {
  const obj = new Proxy(
    {},
    {
      get: (_, prop: string) => {
        return (...args: any) => {
          // console.log('dispatch action', prop, args);
          appDispatch({
            type: prop,
            data: args,
          })
        }
      },
    },
  )
  return obj as Actions
}
