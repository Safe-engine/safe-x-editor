import { ensureDirSync, ensureFileSync, writeFileSync } from 'fs-extra';
import path = require('path');

const baseUrl = 'https://raw.githubusercontent.com/Safe-engine/safex-cocos-starter/refs/heads/main/';
const repositoryTreeUrl = 'https://api.github.com/repos/Safe-engine/safex-cocos-starter/git/trees/';

type GitHubTreeItem = {
  path: string;
  type: 'blob' | 'tree';
};

type GitHubTreeResponse = {
  tree: GitHubTreeItem[];
};

function getRemoteUrl(filePath: string) {
  return baseUrl.replace('heads/main/', `heads/webgl-vite/`) + filePath;
}

async function getProjectFiles() {
  const url = `${repositoryTreeUrl}webgl-vite?recursive=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw Error(`Failed to fetch template files: ${res.statusText}`);
  }
  const response = await res.json() as GitHubTreeResponse;
  return response.tree.filter((item) => item.type === 'blob' && item.path !== 'package.json');
}

async function downloadProjectFile(workspacePath: string, fileName: string) {
  const url = getRemoteUrl(fileName);
  const res = await fetch(url);
  if (!res.ok) {
    throw Error(`Failed to fetch: ${fileName}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filePath = path.join(workspacePath, fileName);
  ensureFileSync(filePath);
  writeFileSync(filePath, buffer);
}

export async function initProject(workspacePath: string) {
  const url = getRemoteUrl('package.json');
  const res = await fetch(url);
  if (!res.ok) {
    throw Error(`Failed to fetch: ${res.statusText}`);
  }
  const response: any = await res.json();
  ensureDirSync(workspacePath);
  const filePath = path.join(workspacePath, 'package.json');
  response.name = path.basename(workspacePath);
  response.version = '1.0.1';
  response.description = 'game with safex';
  delete response.workspaces;
  // console.log('initProject', filePath, response);
  writeFileSync(filePath, JSON.stringify(response, null, 2).replace(/workspace:*/g, '*'));

  const projectFiles = await getProjectFiles();
  for (let index = 0; index < projectFiles.length; index++) {
    const fileName = projectFiles[index].path;
    if (fileName) {
      await downloadProjectFile(workspacePath, fileName);
    }
  }
}
