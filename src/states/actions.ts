import { default as Tree } from '@colin-luo/tree'
import snakeCase from 'lodash/snakeCase'
import { Dispatch } from 'react'
import { AppState } from './app.reducer'

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
          node[component] = { ...node[component], ...updated }
          draft.selectedNodes[index] = node
        }
      })
    },
    setDragNode(path: string) {
      draft.dragNodePath = path
    },
    createNode(parentPath?: string) {
      if (!draft.dragNodePath) return
      const tree = new Tree(draft.componentTree, 'id', 'children')
      const parentNode = tree.getNode(parentPath)
      const type = draft.dragNodePath.split('/').pop().split('.')[0];
      const key = snakeCase(type).toLowerCase();
      const newNode = {
        id: '',
        "expanded": true,
        "tag": "SpriteRender",
        "props": { "spriteFrame": `{sf_${key}}`, },
        "components": [],
        "children": []
      }
      if (parentNode) {
        if (!parentNode.children) parentNode.children = []
        const id = parentNode.id + '-' + parentNode.children.length
        newNode.id = id
        parentNode.children.push(newNode)
      } else {
        const newId = '0-' + draft.componentTree[0].children.length
        newNode.id = newId
        draft.componentTree[0].children.push(newNode)
      }
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
