import { sendRequest } from 'app/app.ipc'
import { setLastLoadedFile, setLastRootFolder } from 'data/AppData'
import { Dispatch } from 'react'
import toast from 'react-hot-toast'
import { GET_FOLDER_FILES, LOAD_COMPONENT_REQUEST } from 'shared/constant.message'
import { Actions, createActions } from './actions'

function findFirstComponentFile(nodes: any[]): string | undefined {
  for (const node of nodes) {
    if (!node.isDirectory) return node.path
    const found = findFirstComponentFile(node.children || [])
    if (found) return found
  }
}

export function createMiddleware(dispatch: Dispatch<any>, appDispatch?: (action: any) => void) {
  const { getFilesSuccess, loadComponentSuccess } = createActions(dispatch)
  const middlewares: Partial<Actions> = {
    async getFiles(src: string) {
      const data: any = await sendRequest({
        key: GET_FOLDER_FILES,
        src,
      })
      if (!data || data.error) {
        toast.error(data?.message || 'Unable to load project files')
        return
      }
      setLastRootFolder(src)
      const firstFile = findFirstComponentFile(data.componentsTree)
      if (firstFile) setLastLoadedFile(firstFile)
      getFilesSuccess(data)
      window.postMessage({ type: 'reloadProjectData' }, '*')

      if (firstFile && appDispatch) {
        appDispatch({ type: 'loadComponent', data: [firstFile] })
      }
    },
    async loadComponent(path: string) {
      const data: any = await sendRequest({
        key: LOAD_COMPONENT_REQUEST,
        path,
      })
      loadComponentSuccess(data)
    },
  }
  return middlewares
}

export const applyMiddleware = (dispatch: Dispatch<any>) => {
  const appDispatch = async (action: any) => {
    const middlewares = createMiddleware(dispatch, appDispatch)
    if (middlewares[action.type]) {
      middlewares[action.type](...action.data)
    }
    dispatch(action)
  }
  return appDispatch
}
