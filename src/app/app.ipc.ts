import { ipcRenderer } from 'electron'
import { IpcRequest } from 'shared/types.message';
// const { listen, ipcRenderer } = window.expose;

export const sendRequest = (request: IpcRequest) => {
  const { key, ...rest } = request;
  ipcRenderer.send(key, rest);
  console.log('sendRequest: ', key, rest);
  return new Promise((resolve) => {
    ipcRenderer.on(key, (sender: any, response) => {
      console.log('response: ', response);
      resolve(response);
    });
  });
};
