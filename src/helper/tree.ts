export interface TreeNode {
  id: string;
  children: TreeNode[]
}

function getId(name: string, isDirectory: boolean, data, type: string) {
  if (isDirectory) return name
  if (type === 'dragonBones') return data.value.atlas
  if (type === 'frame') {
    return name
  }
  return data.value
}

function createNode(path: string[], tree: TreeNode[], data, type: string) {
  const name = path.shift();
  const idx = tree.findIndex((e: TreeNode) => {
    return e.id == name;
  });
  const isDirectory = path.length > 0;
  // console.log('createNode', name, idx, path, isDirectory, type, getId(name, isDirectory, data, type));
  if (idx < 0) {
    tree.push({
      id: getId(name, isDirectory, data, type),
      name,
      type,
      ...data,
      isDirectory,
      children: []
    });
    if (path.length !== 0) {
      createNode(path, tree[tree.length - 1].children, data, type)
    }
  } else {
    createNode(path, tree[idx].children, data, type)
  }
}

export function pathListToTree(data): TreeNode[] {
  const { assetsTextureList = [], dragonBonesAssets = [], fontAssets = [],
    spineAssets = [], spriteSheetAssets = []
  } = data
  const tree: TreeNode[] = [];
  for (let i = 0; i < assetsTextureList.length; i++) {
    const { path } = assetsTextureList[i];
    const split: string[] = path.split('/');
    createNode(split, tree, assetsTextureList[i], 'spriteFrame');
  }
  for (let i = 0; i < dragonBonesAssets.length; i++) {
    const { path } = dragonBonesAssets[i];
    const split: string[] = path.split('/');
    createNode(split, tree, dragonBonesAssets[i], 'dragonBones');
  }
  for (let i = 0; i < spineAssets.length; i++) {
    const { path } = spineAssets[i];
    const split: string[] = path.split('/');
    createNode(split, tree, spineAssets[i], 'spine');
  }
  for (let i = 0; i < fontAssets.length; i++) {
    const { path } = fontAssets[i];
    const split: string[] = path.split('/');
    createNode(split, tree, fontAssets[i], 'font');
  }
  for (let i = 0; i < spriteSheetAssets.length; i++) {
    const { path, json } = spriteSheetAssets[i];
    const split: string[] = path.split('/');
    Object.keys(json.frames).forEach(frame => {
      createNode([...split, frame], tree, spriteSheetAssets[i], 'frame')
    })
  }
  // console.log('pathListToTree', tree);
  return tree;
}