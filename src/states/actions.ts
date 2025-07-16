import Tree from '@colin-luo/tree'
import { Dispatch } from 'react'
import { AppState } from './app.reducer'

const actions = {
  getFiles(src: string) {
    ; (this as AppState).rootFolder = src.replace(/\\/g, '/')
  },
  getFilesSuccess(data) {
    const { componentsTree, componentsCache, assets, designedResolution } = data
      ; (this as AppState).filesData = componentsTree[0].children
      ; (this as AppState).assets = assets
      ; (this as AppState).componentsCache = componentsCache
      ; (this as AppState).settings.designedResolution = designedResolution
  },
  loadComponent(path: string) {
    // if ((this as AppState).filePath !== path)
    ; (this as AppState).filePath = path
  },
  loadComponentSuccess(data) {
    const { treeData, name } = data
      ; (this as AppState).componentTree = [treeData]
      ; (this as AppState).componentPropTypes = (this as AppState).componentTree[0].props
      ; (this as AppState).editingClassNamePath = ''
      ; (this as AppState).selectedNode = {}
      ; (this as AppState).editingPath = name
  },
  selectEditingTagNode(path: string) {
    ; (this as AppState).editingClassNamePath = path
    const tree = new Tree((this as AppState).componentTree, 'id', 'children')
    const node = tree.getNode((this as AppState).editingClassNamePath)
    if (node && node.props) {
      ; (this as AppState).componentPropTypes = node.props
        ; (this as AppState).selectedNode = node
    }
  },
  updateEditingComponent(component: string, updated: any) {
    const tree = new Tree((this as AppState).componentTree, 'id', 'children')
    const node = tree.getNode((this as AppState).editingClassNamePath)
    if (node) {
      node[component] = { ...node[component], ...updated }
        ; (this as AppState).selectedNode = node
    }
  },
  toggleFolder(key: string) {
    let tree = new Tree((this as AppState).filesData, 'path', 'children')
    const node = tree.getNode(key)
    // console.log(key, node, tree)
    node.expanded = !node.expanded
  },
  selecteEditMultinodes(paths: string[]) {
    ; (this as AppState).selectedPaths = paths
    const tree = new Tree((this as AppState).componentTree, 'id', 'children')

      ; (this as AppState).selectedNodes = paths.map((p) => tree.getNode(p))
  },
  updateMultinodes(params: Array<{ component?: string; updated?: any }>) {
    const tree = new Tree((this as AppState).componentTree, 'id', 'children')
    params.forEach((param, index) => {
      const { component, updated } = param
      if (!component) return
      const path = (this as AppState).selectedPaths[index]
      const node = tree.getNode(path)
      if (node) {
        node[component] = { ...node[component], ...updated }
          ; (this as AppState).selectedNodes[index] = node
      }
    })
  },
}

export function getAction(draft: AppState, name: string) {
  return actions[name].bind(draft)
}

export type Actions = typeof actions

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
