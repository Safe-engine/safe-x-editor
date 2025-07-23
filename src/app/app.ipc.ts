import { IpcRequest } from "../shared/types.message";

declare var acquireVsCodeApi
function getVsCodeApi() {
  if (typeof acquireVsCodeApi === 'function') {
    return acquireVsCodeApi();
  }
  return {
    postMessage: (message: any) => {
      console.log('Dev mode postMessage', message);
      fetch('http://localhost:7498', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        // console.log('Response from server:', data);
        window.dispatchEvent(new MessageEvent('message', { data: { messageId: message.messageId, data } }));
      })
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

    vscode.postMessage({ key, payload: rest, messageId });
  });
}
