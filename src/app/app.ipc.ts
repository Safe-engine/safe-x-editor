import { ipcRenderer } from 'electron/renderer';
import { IpcRequest } from 'shared/types.message';

export const sendRequest = (request: IpcRequest) => {
  const { key, ...rest } = request;
  console.log('sendRequest: ', key, rest);
  return ipcRenderer.invoke(key, rest);
};
