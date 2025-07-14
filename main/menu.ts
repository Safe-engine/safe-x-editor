import { GEN_COMPONENT_REQUEST, GET_FOLDER_FILES } from '@shared/constant.message'
import { app, dialog, ipcMain, Menu, shell } from 'electron'

export default class MenuBuilder {
  mainWindow

  constructor(mainWindow) {
    this.mainWindow = mainWindow
  }

  buildMenu() {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
      this.setupDevelopmentEnvironment()
    }

    const template: any = process.platform === 'darwin' ? this.buildDarwinTemplate() : this.buildDefaultTemplate()

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

    return menu
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
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen())
          },
        },
      ],
    }
    const subMenuLanguage = {
      label: 'Language',
      submenu: [
        {
          label: 'English',
          accelerator: 'Ctrl+Command+E',
          click: () => {
            this.mainWindow.webContents.send('CHANGE_LANGUAGE', 'en')
          },
        },
        {
          label: 'Vietnamese',
          accelerator: 'Ctrl+Command+V',
          click: () => {
            this.mainWindow.webContents.send('CHANGE_LANGUAGE', 'vn')
          },
        },
      ],
    }
    const subMenuWindow = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    }
    const subMenuHelp = {
      label: 'Help',
      submenu: [
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
    const subMenuResizeImage = {
      label: 'Create Files',
      submenu: [
        {
          label: 'Create New Action',
          accelerator: 'Ctrl+Command+A',
          click: () => {
            this.mainWindow.webContents.send('CREATE_NEW_ACTION')
          },
        },
        {
          label: 'Create I18N',
          accelerator: 'Ctrl+Command+I',
          click: () => {
            this.mainWindow.webContents.send('CREATE_I18N')
          },
        },
      ],
    }

    const subMenuView = process.env.NODE_ENV === 'development' ? subMenuViewDev : subMenuViewProd

    return [subMenuAbout, subMenuEdit, subMenuView, subMenuLanguage, subMenuResizeImage, subMenuWindow, subMenuHelp]
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: '&File',
        submenu: [
          {
            label: '&Open',
            accelerator: 'Ctrl+O',
            click: () => {
              const [root] = dialog.showOpenDialogSync(this.mainWindow, {
                title: 'Select project folder.',
                properties: ['openDirectory'],
              })
              // const files = getFilesInFolder({ src: root })
              console.log(root)
              // this.mainWindow.webContents.send(GET_FOLDER_FILES, { src: root });
              ipcMain.emit(GET_FOLDER_FILES, root)
            },
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
