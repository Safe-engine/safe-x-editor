import { default as Tree } from '@colin-luo/tree'
import { Dispatch } from 'react'
import { AppState } from './app.reducer'

export function getAction(draft: AppState) {
  const actions = {
    getFiles(src: string) {
      draft.rootFolder = src.replace(/\\/g, '/')
    },
    getFilesSuccess(data) {
      const { componentsCache, assets, designedResolution, isPixi } = data
      // draft.filesData = componentsTree[0].children
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
    toggleFolder(key: string) {
      // let tree = new Tree(draft.filesData, 'path', 'children')
      // const node = tree.getNode(key)
      console.log(key, 'toggleFolder')
      // node.expanded = !node.expanded
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
