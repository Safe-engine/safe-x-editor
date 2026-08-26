import {
  ADD_OPEN_WITH_APP_REQUEST,
  CONFIGURE_SETTINGS,
  GEN_COMPONENT_REQUEST,
  GET_FOLDER_FILES,
  GET_OPEN_WITH_APPS_REQUEST,
  NEW_PROJECT,
  REMOVE_OPEN_WITH_APP_REQUEST,
  TOGGLE_RULER,
  TOGGLE_SNAP,
} from '@shared/constant.message'
import { execFile } from 'child_process'
import { app, dialog, ipcMain, Menu, nativeImage, shell } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { basename, join } from 'path'
import packageJson from '../package.json'
import { GlobalData } from './parser/global'

const OPEN_WITH_SETTINGS_FILE = 'open-with.json'

type OpenWithSettings = {
  customAppPath?: string
  customAppPaths?: string[]
}

export default class MenuBuilder {
  mainWindow

  constructor(mainWindow) {
    this.mainWindow = mainWindow
    this.setupOpenWithIpc()
  }

  buildMenu() {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
      this.setupDevelopmentEnvironment()
    }

    return this.refreshMenu()
  }

  refreshMenu() {
    const template: any = process.platform === 'darwin' ? this.buildDarwinTemplate() : this.buildDefaultTemplate()

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

    return menu
  }

  getOpenWithSettings(): OpenWithSettings {
    const settingsPath = join(app.getPath('userData'), OPEN_WITH_SETTINGS_FILE)
    if (!existsSync(settingsPath)) return {}

    try {
      return JSON.parse(readFileSync(settingsPath, 'utf-8'))
    } catch {
      return {}
    }
  }

  saveOpenWithSettings(settings: OpenWithSettings) {
    writeFileSync(join(app.getPath('userData'), OPEN_WITH_SETTINGS_FILE), JSON.stringify(settings), 'utf-8')
  }

  getCustomAppPaths() {
    const { customAppPath, customAppPaths } = this.getOpenWithSettings()
    return [...new Set([...(customAppPaths || []), customAppPath].filter(Boolean))]
  }

  setupOpenWithIpc() {
    ipcMain.handle(GET_OPEN_WITH_APPS_REQUEST, () => ({ apps: this.getCustomAppPaths() }))
    ipcMain.handle(ADD_OPEN_WITH_APP_REQUEST, () => {
      const [appPath] = dialog.showOpenDialogSync(this.mainWindow, {
        title: 'Select an application to open projects',
        properties: ['openFile', 'openDirectory'],
      }) || []
      if (!appPath) return { apps: this.getCustomAppPaths() }

      const apps = [...new Set([...this.getCustomAppPaths(), appPath])]
      this.saveOpenWithSettings({ customAppPaths: apps })
      this.refreshMenu()
      return { apps }
    })
    ipcMain.handle(REMOVE_OPEN_WITH_APP_REQUEST, (_event, { appPath }) => {
      const apps = this.getCustomAppPaths().filter(path => path !== appPath)
      this.saveOpenWithSettings({ customAppPaths: apps })
      this.refreshMenu()
      return { apps }
    })
  }

  openProjectInApp(application: string) {
    const projectPath = GlobalData.rootProject
    if (!projectPath) return

    if (process.platform === 'darwin') {
      execFile('open', ['-a', application, projectPath], error => {
        if (error) dialog.showErrorBox('Unable to open project', `Could not open ${application}.`)
      })
      return
    }

    execFile(application, [projectPath], error => {
      if (error) dialog.showErrorBox('Unable to open project', `Could not open ${application}.`)
    })
  }

  showProjectInFinder() {
    if (GlobalData.rootProject) shell.showItemInFolder(GlobalData.rootProject)
  }

  configureSettings() {
    ipcMain.emit(CONFIGURE_SETTINGS)
  }

  showAboutDialog() {
    const iconCandidates = [
      join(__dirname, '../../resources/icons/512x512.png'),
      join(app.getAppPath(), 'resources/icons/512x512.png'),
    ]
    const iconPath = iconCandidates.find(p => existsSync(p))
    const icon = iconPath ? nativeImage.createFromPath(iconPath) : undefined

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About',
      message: 'Safex Editor',
      detail: `Version: ${packageJson.version}`,
      icon,
      buttons: ['OK'],
    })
  }

  buildSnapMenuItem() {
    return {
      label: 'Snap',
      type: 'checkbox' as const,
      checked: true,
      click: (menuItem: { checked?: boolean }) => this.mainWindow.webContents.send(TOGGLE_SNAP, Boolean(menuItem.checked)),
    }
  }

  buildRulerMenuItem() {
    return {
      label: 'Ruler',
      type: 'checkbox' as const,
      checked: true,
      click: (menuItem: { checked?: boolean }) => this.mainWindow.webContents.send(TOGGLE_RULER, Boolean(menuItem.checked)),
    }
  }

  buildOpenWithSubmenu() {
    const submenu: any[] = [
      {
        label: 'Finder',
        click: () => this.showProjectInFinder(),
      },
      {
        label: 'VS Code',
        click: () => this.openProjectInApp('Visual Studio Code'),
      },
      {
        label: 'Codex',
        click: () => this.openProjectInApp('Codex'),
      },
    ]

    for (const appPath of this.getCustomAppPaths()) {
      submenu.push({
        label: basename(appPath, '.app'),
        click: () => this.openProjectInApp(appPath),
      })
    }

    return submenu
  }

  setupDevelopmentEnvironment() {
    this.mainWindow.openDevTools()
    this.mainWindow.webContents.on('context-menu', (e, props) => {
      const { x, y } = props

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.inspectElement(x, y)
          },
        },
      ]).popup(this.mainWindow)
    })
  }

  buildDarwinTemplate() {
    const subMenuAbout = {
      label: 'Safex',
      submenu: [
        {
          label: '&New...',
          accelerator: 'Command+N',
          click: () => {
            ipcMain.emit(NEW_PROJECT)
          },
        },
        {
          label: '&Open',
          accelerator: 'Command+O',
          click: () => {
            const [root] = dialog.showOpenDialogSync(this.mainWindow, {
              title: 'Select project folder.',
              properties: ['openDirectory'],
            })
            // const files = getFilesInFolder({ src: root })
            // console.log(root)
            ipcMain.emit(GET_FOLDER_FILES, root)
          },
        },
        {
          label: '&Save',
          accelerator: 'Command+S',
          click: () => {
            ipcMain.emit(GEN_COMPONENT_REQUEST)
          },
        },
        {
          label: 'Open With',
          submenu: this.buildOpenWithSubmenu(),
        },
        {
          label: 'Settings…',
          click: () => this.configureSettings(),
        },
        { type: 'separator' },
        {
          label: 'Hide Safex Editor',
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:',
        },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit()
          },
        },
      ],
    }
    const subMenuEdit = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    }
    const subMenuViewDev = {
      label: 'View',
      submenu: [
        this.buildSnapMenuItem(),
        this.buildRulerMenuItem(),
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload()
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen())
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.toggleDevTools()
          },
        },
      ],
    }
    const subMenuViewProd = {
      label: 'View',
      submenu: [
        this.buildSnapMenuItem(),
        this.buildRulerMenuItem(),
        { type: 'separator' },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen())
          },
        },
      ],
    }
    const subMenuHelp = {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => this.showAboutDialog(),
        },
        { type: 'separator' },
        {
          label: 'Learn More',
          click() {
            shell.openExternal('http://electron.atom.io')
          },
        },
        {
          label: 'Documentation',
          click() {
            shell.openExternal('https://github.com/atom/electron/tree/master/docs#readme')
          },
        },
        {
          label: 'Community Discussions',
          click() {
            shell.openExternal('https://discuss.atom.io/c/electron')
          },
        },
        {
          label: 'Search Issues',
          click() {
            shell.openExternal('https://github.com/atom/electron/issues')
          },
        },
      ],
    }

    const subMenuView = process.env.NODE_ENV === 'development' ? subMenuViewDev : subMenuViewProd

    return [subMenuAbout, subMenuEdit, subMenuView, subMenuHelp]
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: '&File',
        submenu: [
          {
            label: '&New...',
            accelerator: 'Ctrl+N',
            click: () => {
              ipcMain.emit(NEW_PROJECT)
            },
          },
          {
            label: '&Open',
            accelerator: 'Ctrl+O',
            click: () => {
              const [root] = dialog.showOpenDialogSync(this.mainWindow, {
                title: 'Select project folder.',
                properties: ['openDirectory'],
              })
              // const files = getFilesInFolder({ src: root })
              // this.mainWindow.webContents.send(GET_FOLDER_FILES, { src: root });
              ipcMain.emit(GET_FOLDER_FILES, root)
            },
          },
          {
            label: 'Open With',
            submenu: this.buildOpenWithSubmenu(),
          },
          {
            label: 'Settings…',
            click: () => this.configureSettings(),
          },
          {
            label: '&Close',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close()
            },
          },
        ],
      },
      {
        label: '&View',
        submenu:
          process.env.NODE_ENV === 'development'
              ? [
                this.buildSnapMenuItem(),
                this.buildRulerMenuItem(),
                { type: 'separator' },
                {
                  label: '&Reload',
                  accelerator: 'Ctrl+R',
                  click: () => {
                    this.mainWindow.webContents.reload()
                  },
                },
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen())
                  },
                },
                {
                  label: 'Toggle &Developer Tools',
                  accelerator: 'Alt+Ctrl+I',
                  click: () => {
                    this.mainWindow.toggleDevTools()
                  },
                },
              ]
            : [
                this.buildSnapMenuItem(),
                this.buildRulerMenuItem(),
                { type: 'separator' },
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen())
                  },
                },
              ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About',
            click: () => this.showAboutDialog(),
          },
          { type: 'separator' },
          {
            label: 'Learn More',
            click() {
              shell.openExternal('http://electron.atom.io')
            },
          },
          {
            label: 'Documentation',
            click() {
              shell.openExternal('https://github.com/atom/electron/tree/master/docs#readme')
            },
          },
          {
            label: 'Community Discussions',
            click() {
              shell.openExternal('https://discuss.atom.io/c/electron')
            },
          },
          {
            label: 'Search Issues',
            click() {
              shell.openExternal('https://github.com/atom/electron/issues')
            },
          },
        ],
      },
    ]

    return templateDefault
  }
}
