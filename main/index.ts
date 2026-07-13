import Router from '@@/router/Router';
import { enable, initialize } from '@electron/remote/main';
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { installDevtoolExtensions } from './installExtensions';
import MenuBuilder from './menu';

const isDev = !!process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow;
initialize();

function createWindow() {
  if (process.env.NODE_ENV === 'development') {
    installDevtoolExtensions();
  }
  Router();
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    icon: path.resolve(__dirname, '../../resources/icons/512x512.png'),
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: true,
      webSecurity: !isDev,
    },
  });
  enable(mainWindow.webContents);
  // dialog.showMessageBox(mainWindow, { message: basePath, title: "basePath" })
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
