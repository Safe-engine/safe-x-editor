const getRemote = () => {
  const electronRequire = (globalThis as any).require
  return electronRequire?.('@electron/remote')
}

export const ipcMain = {
  on(channel: string, listener: (...args: any[]) => void) {
    return getRemote()?.ipcMain?.on(channel, listener)
  },
  removeListener(channel: string, listener: (...args: any[]) => void) {
    return getRemote()?.ipcMain?.removeListener(channel, listener)
  },
}

export const dialog = {
  showOpenDialogSync(...args: any[]) {
    return getRemote()?.dialog?.showOpenDialogSync(...args)
  },
}

export const getCurrentWindow = () => getRemote()?.getCurrentWindow?.()
