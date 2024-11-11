import { ipcMain } from '@electron/remote';
import { IpcRequest } from 'shared/types.message';

export const sendRequest = (request: IpcRequest) => {
  const { key, ...rest } = request;
  console.log('sendRequest: ', key, rest);
  return new Promise((resolve) => {
    ipcMain.once(key, (response) => {
      console.log('response: ', response);
      resolve(response);
    });
    ipcMain.emit(key, rest);
  });
};
