import Tree from '@colin-luo/tree'
import { pathListToTree } from 'helper/tree'
import { Dispatch } from 'react'
import { AppState } from './app.reducer'

function getNearestTreeNode(tree: Tree, path: string) {
  let treePath = path
  while (treePath) {
    const node = tree.getNode(treePath)
    if (node) return node
    treePath = treePath.slice(0, treePath.lastIndexOf('-'))
  }
  return undefined
}

export function getAction(draft: AppState) {
  const actions = {
    getFiles(src: string) {
      draft.rootFolder = src.replace(/\\/g, '/')
    },
    getFilesSuccess(data) {
      const { componentsTree, componentsCache, assets, colors, designedResolution, isPixi } = data
      draft.filesData = componentsTree[0].children
      draft.resourceFilesData = pathListToTree(assets) || []
      draft.assets = assets
      draft.colors = colors || []
      draft.componentsCache = componentsCache
      draft.settings.designedResolution = designedResolution
      draft.isPixi = isPixi
    },
    loadComponent(path: string) {
      // if (draft.filePath !== path)
      draft.filePath = path
      draft.selectedPaths = []
      draft.selectedNodes = []
    },
    setPreviewAsset(data: any) {
      draft.previewAsset = data
    },
    loadComponentSuccess(data) {
      const { treeData, name } = data
      draft.componentTree = [treeData]
      draft.componentPropTypes = draft.componentTree[0].props
      draft.editingClassNamePath = ''
      // draft.selectedNode = {}
      draft.editingPath = name
    },
    selectEditingTagNode(path: string) {
      draft.editingClassNamePath = path
      const tree = new Tree(draft.componentTree, 'id', 'children')
      const node = tree.getNode(draft.editingClassNamePath)
      if (node && node.props) {
        draft.componentPropTypes = node.props
        // draft.selectedNode = node
      }
    },
    updateEditingComponent(component: string, updated: any) {
      const tree = new Tree(draft.componentTree, 'id', 'children')
      const node = tree.getNode(draft.editingClassNamePath)
      if (node) {
        node[component] = { ...node[component], ...updated }
        // draft.selectedNode = node
      }
    },
    toggleFolder(key: string) {
      let tree = new Tree(draft.filesData, 'path', 'children')
      const node = tree.getNode(key)
      // console.log(key, node, tree)
      node.expanded = !node.expanded
    },
    selectEditMultiNodes(paths: string[]) {
      draft.selectedPaths = paths
      const tree = new Tree(draft.componentTree, 'id', 'children')
      draft.selectedNodes = paths.map((path) => getNearestTreeNode(tree, path))
    },
    updateMultiNodes(params: Array<{ component?: string; updated?: any }>) {
      const tree = new Tree(draft.componentTree, 'id', 'children')
      params.forEach((param, index) => {
        const { component, updated } = param
        if (!component) return
        const path = draft.selectedPaths[index]
        const node = getNearestTreeNode(tree, path)
        if (node) {
          node[component] = Array.isArray(updated) ? updated : { ...node[component], ...updated }
          draft.selectedNodes[index] = node
        }
      })
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
