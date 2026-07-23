import { filterTree, getTreeData } from '@@/utils/Helper';
import DirectoryTree from 'directory-tree';
import { existsSync, readdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path/posix';
import { pathToFileURL } from 'url';
import { Uri, WebviewView, workspace } from 'vscode';
import { getResolutionSettings } from '../helper/settings';
import { loadSpineFile } from '../helper/spine';
import { GlobalData } from '../parser/global';
import { getClassesMetaData } from '../parser/metadata';
import { parseAssetsSrcFile, parseEnums, parseJsonCache } from './assets';
import { loadComponent } from './ComponentService';

const panel: WebviewView = {
  webview: {
    asWebviewUri: (uri: Uri) => {
      // console.log('asWebviewUri', uri);
      return pathToFileURL(uri.fsPath).href
    }, // Giả lập phương thức để trả về đường dẫn file
  }
};

export const getFilesInFolder = async ({ src }) => {
  const packageJson = join(src, 'package.json').replace(/\\/g, '/');
  // console.log('getFilesInFolder', src, packageJson)
  if (!existsSync(packageJson)) {
    throw Error('No package.json.');
  }
  const content = readFileSync(packageJson, 'utf-8');
  if (!content.includes("@safe-engine")) {
    throw Error('Not Safex project.');
  }
  const projectName = JSON.parse(content).name;
  GlobalData.rootProject = src;
  workspace.workspaceFolders = [{ uri: Uri.file(GlobalData.rootProject) }]
  await getClassesMetaData(src);
  const assetsTSFolder = join(src, 'src', 'assets');
  const assetsTextureList = parseAssetsSrcFile(join(assetsTSFolder, 'TextureAssets.ts'), panel);
  const fontAssets = parseAssetsSrcFile(join(assetsTSFolder, 'FontAssets.ts'), panel);
  const jsonAssets = parseAssetsSrcFile(join(assetsTSFolder, 'JsonAssets.ts'), panel);
  const audioAssets = parseAssetsSrcFile(join(assetsTSFolder, 'AudioAssets.ts'), panel);
  const spriteSheetAssets = parseAssetsSrcFile(join(assetsTSFolder, 'SpriteSheetAssets.ts'), panel);
  const dragonBonesAssets = parseAssetsSrcFile(join(assetsTSFolder, 'DragonBonesAssets.ts'), panel);
  const spineAssetsFile = join(assetsTSFolder, 'SpineAssets.ts');
  const spineAssets = parseAssetsSrcFile(spineAssetsFile, panel);
  const spineSourceAssets = parseAssetsSrcFile(spineAssetsFile);
  const spriteFramesAssets = parseAssetsSrcFile(join(assetsTSFolder, 'SpriteFrames.ts'));
  const colors = parseAssetsSrcFile(join(src, 'src', 'helper', 'constant.ts'), panel, true);
  const jsonCaches = parseJsonCache(join(src, 'src', 'data', 'JsonCache.ts'), jsonAssets);
  const enumsList = parseEnums(join(src, 'src', 'helper', 'constant.ts'), jsonAssets);
  const designedResolution = getResolutionSettings(src);
  GlobalData.designedResolution = designedResolution;
  GlobalData.spineAnimations = {};
  // console.log('spineAssets', JSON.stringify(spineAssets, null, 2));
  spineSourceAssets.forEach(({ key, value }) => {
    const { skeleton, atlas } = value;
    if (!skeleton) { return; }
    const data = loadSpineFile(skeleton.replace(/\\/g, '/'), atlas);
    GlobalData.spineAnimations[key] = {
      animations: data?.animations?.map(({ name }) => name),
      skins: data?.skins?.map(({ name }) => name),
    };
  });
  const componentsCache = {};
  const files = await readdirSync(join(src, 'src', 'components'), { recursive: true }) as string[];
  // console.log(files, 'files');
  const components = files
    .filter(file => file.endsWith('.tsx'))
    .map(async file => {
      const filePath = join(src, 'src', 'components', file);
      const { name, treeData } = await loadComponent({ path: filePath });
      componentsCache[name] = treeData;
      return filePath;
    });
  await Promise.all(components);
  const jsxOption: DirectoryTree.DirectoryTreeOptions = {
    extensions: /\.tsx$/,
    exclude: [],
    attributes: ['type', 'extension'],
  };
  GlobalData.componentsCache = componentsCache;
  const config = workspace.getConfiguration('safexEditor');
  const defaultProps = config.get<object>('defaultProps');
  return {
    componentsTree: getTreeData(filterTree([DirectoryTree(join(src, 'src'), jsxOption)])),
    colors,
    enumsList,
    projectName,
    assets: {
      assetsTextureList,
      fontAssets,
      jsonAssets,
      audioAssets,
      spriteSheetAssets,
      spriteFramesAssets,
      dragonBonesAssets,
      spineAssets,
      spineAnimations: GlobalData.spineAnimations,
    },
    componentsCache,
    defaultProps,
    jsonCaches,
    staticPropsMap: GlobalData.staticPropsMap,
    designedResolution
  };
};

export const checkFileExist = async ({ folderPath }) => existsSync(folderPath);

export const deleteFolder = async ({ path, folderPath }) => {
  rmSync(path || folderPath, { recursive: true, force: true });
  return true;
};
