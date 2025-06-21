import Router from '@@/router/Router';
import { enable, initialize } from '@electron/remote/main';
import { app, BrowserWindow } from 'electron';
import isDev from 'electron-is-dev';
import path from 'path';
import url from 'url';
import { installDevtoolExtensions } from './installExtensions';
import MenuBuilder from './menu';

// const isDev = false;
const basePath = isDev ? __dirname : app.getAppPath();

let mainWindow: BrowserWindow;
initialize();

function createWindow() {
  console.log('basePath', basePath);
  if (process.env.NODE_ENV === 'development') {
    installDevtoolExtensions();
  }
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    icon: path.resolve(basePath, '../../resources/icons/512x512.png'),
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

  const file = url.format({
    pathname: path.join(basePath, '..', 'editor.html'),
    protocol: 'file:',
    slashes: true,
  });
  // console.log(file)
  mainWindow.loadURL(isDev ? 'http://localhost:8585' : file);
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    mainWindow.show();
    mainWindow.focus();
    Router();
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
