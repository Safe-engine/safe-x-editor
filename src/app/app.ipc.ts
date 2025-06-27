import { IpcRequest } from "../shared/types.message";

declare var acquireVsCodeApi
function getVsCodeApi() {
  if (typeof acquireVsCodeApi === 'function') {
    return acquireVsCodeApi();
  }
  return {
    postMessage: (message: any) => {
      console.log('Dev mode postMessage', message);
    }
  };
}

const vscode = getVsCodeApi();

export function sendRequest(request: IpcRequest) {
  const { key, ...rest } = request;
  const messageId = Math.random();
  return new Promise((resolve) => {
    const handler = (event) => {
      const msg = event.data;
      if (msg.messageId === messageId) {
        window.removeEventListener('message', handler);
        resolve(msg.data);
      }
    };
    window.addEventListener('message', handler);

    vscode.postMessage({ key, rest, messageId });
  });
}
