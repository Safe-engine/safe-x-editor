import * as vscode from 'vscode';

export function getSettingsWebview(
  mainJs: vscode.Uri,
  cssUri: vscode.Uri,
  groupsList: string,
  colliderMatrix: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="${cssUri}" />
        <title>Safex Project Settings</title>
      </head>
      <body>
        <div id="container">
          Groups:
          <div id="groupsContainer">
          </div>
          Collider Matrix:
          <div id="matrixContainer">
          </div>
        </div>
        <div class="buttons-container">
          <button id="save-btn">Save</button>
          <div class="input-container">
        </div>
      </body>
      <script>
        const groupsList = [${groupsList}];
        const colliderMatrix = ${colliderMatrix};
      </script>
      <script src="${mainJs}"></script>
      <style>
        body {
          display: flex;
          gap: 20px;
        }
        .input-container input {
          font-size: smaller;
          width: 50px;
        }
        .active {
          color: orange;
        }
      </style>
    </html>
  `;
}
