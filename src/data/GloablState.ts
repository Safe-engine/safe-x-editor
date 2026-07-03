export type ProjectData = {
  assetsTextureList?: any[]
  fontAssets?: any[]
  spriteFramesAssets?: any[]
  componentsCache?: Record<string, any>
  designedResolution: { width: number; height: number }
  jsonCaches?: Record<string, any>
  staticPropsMap?: Record<string, any>
  enumsList?: Record<string, any>
  [key: string]: any
}

export const GlobalState: {
  data: ProjectData
  filePath: string
  tempFilePath: string
} = {
  data: {
    designedResolution: { width: 0, height: 0 },
  },
  filePath: '',
  tempFilePath: '',
}
