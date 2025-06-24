import Tree, { TreeNode } from '@colin-luo/tree';
import { DirectoryTree } from 'directory-tree';
import fs from 'fs';
import pathUtil from 'path';

export const getTreeData = (treeData: any[]) => {
  const tree = new Tree(treeData, 'path', 'children');
  const ret: any = tree.mapNodes((currentNode): any => (
    {
      id: currentNode.path,
      name: currentNode.name,
      path: currentNode.path,
      isDirectory: currentNode.type === 'directory',
      expanded: currentNode.type === 'directory',
      children: getTreeData(currentNode.children),
      icon: currentNode.type === 'directory' ? '' : 'favicon.ico',
      width: currentNode.width,
      height: currentNode.height,
    }
  ));
  return ret as TreeNode<TreeViewData, 'id', 'items'>[];
};

let filterType;

function isEmptyFolder(root) {
  const { type, children } = root;
  if (type === 'directory') {
    return children.every(isEmptyFolder);
  }
  return false;
}

function filterTreeFunction(currentNode: DirectoryTree) {
  // console.log(currentNode)
  const { type, path, children } = currentNode;
  if (type === 'directory') {
    if (path.includes('norender')) return false
    return !children.every(isEmptyFolder);
  }
  if (filterType === 'images') {
    return true;
  }
  // !FIXME: check is react component?
  const content = fs.readFileSync(path);
  if (content.indexOf('extends ComponentX') !== -1 || content.indexOf('extends SceneComponent') !== -1) {
    return true;
  }
  return false;
}

export function filterTree(treeData: DirectoryTree[]) {
  const tree = new Tree(treeData, 'path', 'children');
  filterType = 'components';
  return tree.filterNodes(filterTreeFunction);
}

export function filterImages(treeData: DirectoryTree[]) {
  const tree = new Tree(treeData, 'path', 'children');
  filterType = 'images';
  return tree.filterNodes(filterTreeFunction);
}

export function sendError(message) {
  return { error: true, message };
}

export function getContainer(path, rootPath) {
  const containersFolder = pathUtil.join(rootPath, 'src', 'containers');
  const parentDir = pathUtil.dirname(path);
  if (parentDir === containersFolder) {
    return path;
  }
  if (parentDir === rootPath) {
    return '';
  }
  return getContainer(parentDir, rootPath);
}

export function isTsx(filePath = '') {
  return filePath.endsWith('.tsx');
}

export function isTsFile(filePath = '') {
  return filePath.endsWith('.ts');
}

export function getComponentNameByPath(filePath) {
  return pathUtil.basename(filePath)
    .replace('.js', '')
    .replace('.ts', '');
}

export function getPropsType({ typeAnnotation }) {
  const { typeName, type, elementType, typeParameters } = typeAnnotation;
  // console.log('typeAnnotation', typeAnnotation);
  if (type === 'TSArrayType') {
    const objectType = getPropsType(elementType);
    return `Array<${objectType}>`;
  }
  if (type === 'TSStringKeyword') {
    // console.log('typeName', typeObj);
    return 'string';
  }
  if (type === 'TSBooleanKeyword') {
    return 'boolean';
  }
  if (type === 'TSNumberKeyword') {
    return 'number';
  }
  if (!typeName) {
    return 'void';
  }
  if (type === 'TSTypeReference') {
    // console.log(typeParameters.params)
    return `${typeName.name}<${typeParameters.params.map(({ typeName }) => typeName.name).join(', ')}>`;
  }
  return typeName.name;
}
