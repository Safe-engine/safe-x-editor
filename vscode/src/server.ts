import { existsSync, readFileSync } from 'fs';
import { createServer } from 'http';
import { dirname, join } from 'path';
import * as vscode from 'vscode';
import { corsMiddleware } from './cors';
import { loadComponent, updateComponentTag } from './services/ComponentService';
import { getFilesInFolder } from './services/FilesService';
import { GEN_COMPONENT_REQUEST, GET_FOLDER_FILES, LOAD_COMPONENT_REQUEST } from './shared/constant.message';

function getProjectPath(filePath) {
  // Giả sử filePath là đường dẫn đầy đủ đến file, ta cần lấy thư mục cha chứa file package.json
  const dirFolder = dirname(filePath);
  // Tìm kiếm package.json trong thư mục cha
  let currentDir = dirFolder;
  while (currentDir !== '/') {
    const packageJsonPath = join(currentDir, 'package.json');
    if (existsSync(packageJsonPath))
      return currentDir; // Trả về thư mục chứa package.json
    // Nếu không tìm thấy, tiếp tục lên thư mục cha
    currentDir = dirname(currentDir);
  }
  throw new Error('Không tìm thấy package.json trong cây thư mục');
}

function getResponse(message, panel, filePath) {
  const { key, payload } = message;
  switch (key) {
    case LOAD_COMPONENT_REQUEST: {
      // payload.path = filePath; // Đảm bảo đường dẫn đúng
      return loadComponent(payload)
    }
    case GET_FOLDER_FILES: {
      payload.src = getProjectPath(filePath);
      return getFilesInFolder(payload, panel)
    }
    case GEN_COMPONENT_REQUEST: {
      // payload.filePath = filePath;
      return updateComponentTag(payload)
    }
  }
}

export function startServer(filePath) {
  console.log('Starting server...');
  createServer((req, res) => {
    const shouldContinue = corsMiddleware(req, res);
    if (!shouldContinue) return;
    let body = '';
    // Thu thập từng phần dữ liệu
    req.on('data', chunk => {
      body += chunk;
    });
    // Khi nhận xong toàn bộ body
    req.on('end', async () => {
      try {
        const json = JSON.parse(body);
        // console.log('Received JSON:', json);
        const rootPath = getProjectPath(filePath);
        const port = getDevPort(rootPath);
        const mockPanel = {
          webview: {
            asWebviewUri: (uri: vscode.Uri) => uri.fsPath.replace(rootPath + '/res', 'http://localhost:' + port), // Giả lập phương thức để trả về đường dẫn file
          }
        }
        const response = await getResponse(json, mockPanel, filePath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (e) {
        console.error('Error processing request:', e);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  }).listen(7498, () => {
    console.log('Server is running on http://localhost:7498');
  });
}

function getDevPort(rootPath: string) {
  const viteJsonPath = join(rootPath, 'vite.config.ts');
  if (existsSync(viteJsonPath)) {
    const vite = readFileSync(viteJsonPath, 'utf-8');
    const match = vite.match(/port:\s*(\d+)/);
    if (match) {
      return match[1];
    }
  }
  const packageJsonPath = join(rootPath, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const { dev } = packageJson.scripts
  if (!dev) {
    throw new Error('No dev script found in package.json');
  }
  const match = dev.match(/-p\s*(\d+)/);
  if (!match) {
    throw new Error('No port found in dev script');
  }
  return match[1];
}