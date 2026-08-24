export interface TreeNode {
  id: string
  children: TreeNode[]
}

function normalizeResourcePath(path = '') {
  const parts: string[] = []
  path.replace(/\\/g, '/').split('/').forEach((part) => {
    if (!part || part === '.') return
    if (part === '..') {
      parts.pop()
      return
    }
    parts.push(part)
  })
  return parts.join('/')
}

function isTiledMapAsset(asset: any) {
  const { path = '', json } = asset
  return /\.(tmx|tmj)$/i.test(path) || json?.type === 'map' || (Array.isArray(json?.layers) && Array.isArray(json?.tilesets))
}

function isDicedSpriteAsset(asset: any) {
  return Boolean(asset?.json?.meta && Array.isArray(asset.json.animations))
}

function getDicedSpriteTexturePaths(jsonAssets: any[]) {
  const texturePaths = new Set<string>()
  jsonAssets.filter(isDicedSpriteAsset).forEach(({ path, json }) => {
    if (typeof json.meta.name !== 'string' || !json.meta.name) return
    const directory = normalizeResourcePath(path).split('/').slice(0, -1).join('/')
    texturePaths.add(normalizeResourcePath(`${directory}/${json.meta.name}.png`))
  })
  return texturePaths
}

function getTiledMapTexturePaths(jsonAssets: any[]) {
  const texturePaths = new Set<string>()
  jsonAssets.filter(isTiledMapAsset).forEach(({ path, json }) => {
    const directory = normalizeResourcePath(path).split('/').slice(0, -1).join('/')
    json?.tilesets?.forEach((tileset) => {
      if (typeof tileset.image !== 'string') return
      texturePaths.add(normalizeResourcePath(`${directory}/${tileset.image}`))
    })
  })
  return texturePaths
}

function getId(name: string, isDirectory: boolean, data, type: string) {
  if (isDirectory) return name
  if (type === 'dragonBones') return data.value?.atlas
  if (type === 'spine') return data.path
  if (type === 'frame') {
    return name
  }
  return data.value
}

function createNode(path: string[], tree: TreeNode[], data, type: string, directoryPath = '') {
  const name = path.shift()
  const idx = tree.findIndex((e: TreeNode) => {
    return e.id == name
  })
  const isDirectory = path.length > 0
  const nodePath = normalizeResourcePath(`${directoryPath}/${name}`)
  // console.log('createNode', name, idx, path, isDirectory, type, getId(name, isDirectory, data, type));
  if (idx < 0) {
    const element = {
      id: getId(name, isDirectory, data, type),
      name,
      type,
      ...data,
      path: isDirectory ? nodePath : data.path,
      isDirectory,
      children: [],
    }
    tree.push(element)
    if (path.length !== 0) {
      createNode(path, tree[tree.length - 1].children, data, type, nodePath)
    }
  } else {
    createNode(path, tree[idx].children, data, type, nodePath)
  }
}

export function pathListToTree(data): TreeNode[] {
  const { assetsTextureList = [], audioAssets = [], dragonBonesAssets = [], fontAssets = [], jsonAssets = [], spineAssets = [], spriteSheetAssets = [] } = data
  const tree: TreeNode[] = []
  const tiledMapTexturePaths = getTiledMapTexturePaths(jsonAssets)
  const dicedSpriteTexturePaths = getDicedSpriteTexturePaths(jsonAssets)
  for (let i = 0; i < assetsTextureList.length; i++) {
    const { path } = assetsTextureList[i]
    if (tiledMapTexturePaths.has(normalizeResourcePath(path)) || dicedSpriteTexturePaths.has(normalizeResourcePath(path))) continue
    const split: string[] = path.split('/')
    createNode(split, tree, assetsTextureList[i], 'spriteFrame')
  }
  for (let i = 0; i < dragonBonesAssets.length; i++) {
    const { path } = dragonBonesAssets[i]
    const split: string[] = path.split('/')
    createNode(split, tree, dragonBonesAssets[i], 'dragonBones')
  }
  for (let i = 0; i < audioAssets.length; i++) {
    const { path } = audioAssets[i]
    const split: string[] = path.split('/')
    createNode(split, tree, audioAssets[i], 'audio')
  }
  for (let i = 0; i < spineAssets.length; i++) {
    const { path } = spineAssets[i]
    const split: string[] = path.split('/')
    createNode(split, tree, spineAssets[i], 'spine')
  }
  for (let i = 0; i < jsonAssets.length; i++) {
    const { path } = jsonAssets[i]
    const type = isDicedSpriteAsset(jsonAssets[i]) ? 'dicedSprite' : isTiledMapAsset(jsonAssets[i]) ? 'tiledMap' : undefined
    if (!type) continue
    const split: string[] = path.split('/')
    createNode(split, tree, jsonAssets[i], type)
  }
  for (let i = 0; i < fontAssets.length; i++) {
    const { path } = fontAssets[i]
    const split: string[] = path.split('/')
    createNode(split, tree, fontAssets[i], 'font')
  }
  for (let i = 0; i < spriteSheetAssets.length; i++) {
    const { path, json } = spriteSheetAssets[i]
    const frames = json?.frames
    if (!frames) continue
    const split: string[] = path.split('/')
    Object.keys(frames).forEach((frame) => {
      createNode([...split, frame], tree, spriteSheetAssets[i], 'frame')
    })
  }
  // console.log('pathListToTree', tree);
  return tree
}
