import { default as Tree } from '@colin-luo/tree';
import { current } from 'immer';
import { cloneDeep, snakeCase } from 'lodash';
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
      const { componentsTree, componentsCache, assets, designedResolution, isPixi } = data
      draft.filesData = componentsTree[0].children
      draft.assets = assets
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
          // console.log('updateMultiNodes middleware', current(node[component]), component)
          const { xy = [0, 0] } = node[component]?.node || {}
          undoStack.push({ name: 'undo', data: [draft.selectedPaths[0], component, { node: { xy: [...xy] } }] });
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
    setDragNode(node: any) {
      draft.dragNode = node
    },
    arrangeNode(parentPath: string, dragIds: string[] = []) {
      const tree = new Tree(draft.componentTree, 'id', 'children')
      let parentNode = tree.getNode(parentPath)
      dragIds.forEach(id => {
        let dragNode = tree.getNode(parentPath)
        parentNode.children.push(cloneDeep(dragNode))
      })
      tree.removeNodes(dragIds)
      const iterator = function (node, index, parent, level) {
        if (!parent) node.id = '0'
        else node.id = parent.id + '-' + index
        // console.log(current(node), index)
      };
      tree.walker(iterator, null, 'breadth');
      draft.selectedPaths = []
      draft.selectedNodes = []
      window.postMessage({ type: 'refresh' })
    },
    createNode(parentPath?: string) {
      if (!draft.dragNode.path) {
        return
      }
      const tree = new Tree(draft.componentTree, 'id', 'children')
      let parentNode = tree.getNode(parentPath)
      const { type, key, name } = draft.dragNode
      console.log('createNode', current(draft.dragNode), parentPath)
      const newNode: any = {
        id: '',
        "expanded": true,
        "tag": "SpriteRender",
        "props": { "spriteFrame": `{${key}}` },
        "components": [],
        "children": []
      }
      switch (type) {
        case 'spriteFrame':
          break;
        case 'dragonBones':
          newNode.tag = 'DragonBonesComp'
          newNode.props = { data: `{${key}}` }
          break;
        case 'spine':
          newNode.tag = 'SpineSkeleton'
          newNode.props = { data: `{${key}}` }
          break;
        case 'font':
          newNode.tag = 'LabelComp'
          if (name === 'defaultFont') {
            newNode.props = { string: 'Label' }
            break;
          }
          newNode.props = { string: 'Label', fontName: `{${key}}` }
          break;
        case 'frame': {
          const type = name.split('/').pop().split('.')[0];
          const key = snakeCase(type).toLowerCase();
          newNode.props = { spriteFrame: `{sf_${key}}` }
          break;
        }
        default:
          break;
      }
      let parentSize = { width: 100, height: 100 }
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
            parentSize = parentSf.size
          }
        }
      } else {
        const newId = '0-' + draft.componentTree[0].children.length
        newNode.id = newId
        parentSize = draft.settings.designedResolution
        parentNode = draft.componentTree[0]
      }
      const { width, height } = parentSize
      newNode.props.node = { xy: [width * 0.5, height * 0.5] }
      parentNode.children.push(newNode)
      draft.dragNode = {}
      window.postMessage({ type: 'refresh' })
    },
    deleteNodes() {
      const tree = new Tree(draft.componentTree, 'id', 'children')
      tree.removeNodes(draft.selectedNodes)
      const iterator = function (node, index, parent, level) {
        if (!parent) node.id = '0'
        else node.id = parent.id + '-' + index
        // console.log(current(node), index)
      };
      tree.walker(iterator, null, 'breadth');
      draft.selectedPaths = []
      draft.selectedNodes = []
      window.postMessage({ type: 'refresh' })
    }
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
