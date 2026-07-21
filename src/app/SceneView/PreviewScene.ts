import {
  color,
  Color4B,
  EventListener,
  eventManager,
  getWinSize,
  GraphicsRender,
  GUISystem,
  instantiate,
  LabelComp,
  loadAll,
  loader,
  log,
  NodeComp,
  NodeRender,
  registerSystem,
  SceneComponent,
  spriteFrameCache,
  SpriteRender,
  Touch,
  TouchEventRegister,
  Vec2,
} from '@safe-engine/webgl'
import { first, parseInt, set } from 'lodash-es'
import { GlobalState } from '../../data/GloablState'
import { sendRequest } from '../app.ipc'

import { getLastRootFolder, getLastSceneScale, getLastSceneX, getLastSceneY, setLastSceneScale, setLastSceneX, setLastSceneY } from '../../data/AppData'
import { arrow } from './assets'
import { loadSceneViewCocos } from './loader'
import { getCurrentNode, KEY } from './utils'

function getComponentChildrenNum(tag: string) {
  const component = GlobalState.data.componentsCache[tag]
  return Array.isArray(component) ? component.length : (component?.children?.length ?? 0)
}

function getEditingRoot(editingComponent: any, indexes: number[]) {
  const isSceneNode = first<any>(editingComponent)?.tag === 'SceneComponent'
  if (isSceneNode) {
    indexes.shift()
    return first(editingComponent)
  }
  return editingComponent[indexes.shift() ?? 0] ?? first(editingComponent)
}

export class PreviewScene extends SceneComponent {
  arrowContainerNode: NodeComp
  arrowSpriteHorizonNode: NodeComp
  arrowSpriteVerticalNode: NodeComp
  questionContainerNode: NodeComp
  drawNode: NodeComp
  borderNode: NodeComp
  isEditing = false
  isMiddleMouse = false
  shiftKey = false
  ctrlKey = false
  lockX = false
  lockY = false
  editingPaths = []
  editingComponent: any[]

  async start() {
    await this.loadProjectData()
    // console.log(`Running on platform: ${sys.platform}`, sys.DESKTOP_BROWSER, sys.MOBILE_BROWSER)
    this.createBorder()
    this.drawNode = instantiate(NodeRender).node
    this.node.addChild(this.drawNode)
    this.createArrows()
    this.createSaveDialog()
    this.drawNode.position = this.borderNode.position = Vec2(getLastSceneX(), getLastSceneY())
    this.drawNode.scale = this.borderNode.scale = getLastSceneScale()
    this.keyboardHandler()
    this.mouseHandler()
    this.messageHandler()
    // this.loadComponent('/Users/antn/Documents/axmol/hero-dash/src/components/common/BottomMenu.tsx')
  }

  keyboardHandler() {
    eventManager.addListener(
      {
        event: EventListener.KEYBOARD,
        // Khi nhấn phím
        onKeyPressed: async (keyCode) => {
          console.log(`Key pressed: ${keyCode}`)
          if (keyCode === KEY.shift) {
            this.shiftKey = true
            // this.changeSelectPath('0-2')
          }
          if (keyCode === KEY.dash) {
            this.setRootScale(-0.05)
          } else if (keyCode === KEY.equal) {
            this.setRootScale(0.05)
          } else if (keyCode === KEY.x) {
            this.lockX = !this.lockX
            this.arrowSpriteHorizonNode.opacity = this.lockX ? 100 : 255
          } else if (keyCode === KEY.y) {
            this.lockY = !this.lockY
            this.arrowSpriteVerticalNode.opacity = this.lockY ? 100 : 255
          } else if (keyCode === KEY.h) {
            this.toggleSelectedNode()
          } else if (keyCode === KEY.c) {
            this.selectAllChildren()
          }
          if (keyCode === KEY.ctrl || keyCode === KEY.command) {
            this.ctrlKey = true
          }
          if (this.ctrlKey) {
            if (keyCode === KEY.s) {
              this.saveComponent()
            } else if (keyCode === KEY.r) {
              setLastSceneScale(0.5)
              setLastSceneX(0)
              setLastSceneY(0)
              this.loadComponent(GlobalState.filePath)
            } else if (keyCode === KEY.a) {
              await this.loadProjectData()
              this.loadComponent(GlobalState.filePath)
            }
          }
          if (keyCode === KEY.up && this.shiftKey) {
            this.moveSelectedNode(0, 10)
          } else if (keyCode === KEY.down && this.shiftKey) {
            this.moveSelectedNode(0, -10)
          } else if (keyCode === KEY.left && this.shiftKey) {
            this.moveSelectedNode(-10, 0)
          } else if (keyCode === KEY.right && this.shiftKey) {
            this.moveSelectedNode(10, 0)
          } else if (keyCode === KEY.up) {
            this.moveSelectedNode(0, 1)
          } else if (keyCode === KEY.down) {
            this.moveSelectedNode(0, -1)
          } else if (keyCode === KEY.left) {
            this.moveSelectedNode(-1, 0)
          } else if (keyCode === KEY.right) {
            this.moveSelectedNode(1, 0)
          }
        },
        // Khi nhả phím
        onKeyReleased: (keyCode) => {
          if (keyCode === KEY.shift) {
            this.shiftKey = false
          }
          if (keyCode === KEY.ctrl || keyCode === KEY.command) {
            this.ctrlKey = false
          }
        },
      },
      this.node.instance,
    )
  }

  mouseHandler() {
    eventManager.addListener(
      {
        event: EventListener.MOUSE,
        onMouseScroll: (event) => {
          const scrollY = event.getScrollY()
          this.setRootScale(scrollY < 0 ? -0.05 : 0.05)
        },
        onMouseDown: (event) => {
          if (event.getButton() === EventMouse.BUTTON_MIDDLE) {
            this.isMiddleMouse = true
          }
        },
        onMouseUp: (event) => {
          if (event.getButton() === EventMouse.BUTTON_MIDDLE) {
            this.isMiddleMouse = false
          }
        },
      },
      this.node.instance,
    )
  }

  messageHandler() {
    const listener = (event) => {
      const message = event.data
      // console.log('message', message)
      this.questionContainerNode.scale = this.drawNode.scale
      if (message.type === 'reLoad') {
        if (this.isEditing) this.questionContainerNode.active = true
        else this.loadComponent(GlobalState.filePath)
      } else if (message.type === 'changeFilePath') {
        GlobalState.tempFilePath = message.filePath
        if (this.isEditing) this.questionContainerNode.active = true
        else this.loadComponent(GlobalState.tempFilePath)
      } else if (message.type === 'changeSelectPath') {
        this.changeSelectPath(message.selectPaths)
      }
    }
    window.addEventListener('message', listener)
  }

  async loadProjectData() {
    const rootProject = getLastRootFolder()
    if (!rootProject) return
    const data: any = await sendRequest({
      key: 'GET_FOLDER_FILES',
      src: rootProject,
    })
    console.log('start data', data)
    const { assets, ...rest } = data
    GlobalState.data = { ...assets, ...rest }
    const { spriteSheetAssets = [], fontAssets = [] } = assets
    spriteSheetAssets.forEach((spriteSheet) => {
      loader.load([spriteSheet.value, spriteSheet.texture], function (err) {
        if (err) {
          log('Failed to load file:', spriteSheet, err)
          return
        }
        spriteFrameCache.addSpriteFrames(spriteSheet.value, spriteSheet.texture)
      })
    })
    const defaultFontKey = 'REPLACE_WITH_DEFAULT_FONT_PATH'
    const defaultFont = fontAssets.find((font) => font.key === defaultFontKey)?.value
    // console.log('defaultFont', defaultFontKey, fontAssets, defaultFont)
    if (defaultFont) {
      await loadAll([defaultFont])
      GUISystem.defaultFont = defaultFont
    }
  }

  setRootScale(offset: number) {
    const scale = getLastSceneScale()
    let value = scale + offset
    if (value < 0.1) value = 0.1
    if (value > 2) value = 2
    setLastSceneScale(value)
    this.borderNode.scale = this.drawNode.scale = value
    this.updateArrowPosition()
  }

  createBorder() {
    const border = instantiate(GraphicsRender, { strokeColor: color(227, 11, 93, 255), lineWidth: 5 })
    this.borderNode = border.node
    const { designedResolution } = GlobalState.data
    const { width, height } = designedResolution
    border.drawRect(Vec2(), Vec2(width, height))
    this.node.addChild(border.node)
  }

  createArrows() {
    const arrowContainer = instantiate(NodeRender)
    const arrowSpriteHorizon = instantiate(SpriteRender, { spriteFrame: arrow })
    const arrowSpriteVertical = instantiate(SpriteRender, { spriteFrame: arrow })
    this.arrowContainerNode = arrowContainer.node
    this.arrowSpriteHorizonNode = arrowSpriteHorizon.node
    this.arrowSpriteVerticalNode = arrowSpriteVertical.node
    arrowSpriteVertical.node.instance.setAnchorPoint(0.5, 0)
    arrowSpriteHorizon.node.instance.setAnchorPoint(0.5, 0)
    arrowSpriteVertical.node.color = color(255, 0, 0, 255)
    arrowSpriteHorizon.node.instance.setRotation(90)
    arrowContainer.node.addChild(arrowSpriteHorizon.node)
    arrowContainer.node.addChild(arrowSpriteVertical.node)
    this.node.addChild(arrowContainer.node)
  }

  async saveComponent() {
    const data: any = await sendRequest({
      key: 'GEN_COMPONENT_REQUEST',
      nodesData: this.editingComponent[0],
      filePath: GlobalState.filePath,
    })
    console.log('gen success', data)
    this.isEditing = false
  }

  createSaveDialog() {
    const questionContainer = instantiate(LabelComp, { string: 'Do you want to save or reload?' })
    const lbSave = instantiate(LabelComp, { string: 'Save' })
    const lbReload = instantiate(LabelComp, { string: 'Reload' })
    lbSave.addComponent(
      instantiate(TouchEventRegister, {
        onTouchStart: () => {
          this.saveComponent()
          this.loadComponent(GlobalState.tempFilePath)
        },
      }),
    )
    lbReload.addComponent(
      instantiate(TouchEventRegister, {
        onTouchStart: () => {
          this.loadComponent(GlobalState.tempFilePath)
        },
      }),
    )
    lbReload.node.instance.setPosition(150, -150)
    lbSave.node.instance.setPosition(550, -150)
    lbReload.node.color = color(255, 0, 0, 255)
    lbSave.node.color = color(255, 0, 0, 255)
    questionContainer.node.addChild(lbSave.node)
    questionContainer.node.addChild(lbReload.node)
    const { height, width } = getWinSize()
    const DIM_COLOR = Color4B(0, 0, 0, 150)
    const bgGraphics = instantiate(GraphicsRender, { fillColor: DIM_COLOR })
    bgGraphics.drawRect(Vec2(-2500, -2500), Vec2(5000, 5000))
    bgGraphics.node.addChild(questionContainer.node)
    this.questionContainerNode = bgGraphics.node
    this.questionContainerNode.position = Vec2(200, height / 2)
    this.questionContainerNode.active = false
    this.questionContainerNode.scale = 250 / width
    this.node.addChild(this.questionContainerNode)
  }

  async loadComponent(path: string) {
    if (!path) {
      return
    }
    const data: any = await sendRequest({
      key: 'LOAD_COMPONENT_REQUEST',
      path,
    })
    console.log('loadComponent', path, data)
    GlobalState.filePath = path
    this.editingComponent = Array.isArray(data.treeData) ? data.treeData : [data.treeData]
    this.drawNode.removeAllChildren()
    loadSceneViewCocos(data, GlobalState.data, this.drawNode)
    this.questionContainerNode.active = false
    this.isEditing = false
    this.updateArrowPosition()
  }

  getChildrenIndex(editingPath) {
    const isSceneNode = first(this.editingComponent)?.tag === 'SceneComponent'
    const childrenIndex = editingPath.split('-').map(parseInt)
    if (isSceneNode) childrenIndex.shift()
    return childrenIndex
  }

  moveSelectedNode(mx: number, my: number) {
    if (!this.editingPaths[0]) {
      return
    }
    this.editingPaths.forEach((editingPath) => {
      const childrenIndex = this.getChildrenIndex(editingPath)
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      if (!this.lockX) currentNode.posX += mx
      if (!this.lockY) currentNode.posY += my
      const indexes = [...childrenIndex]
      // console.log('editingComponent', this.editingComponent, indexes)
      let editNode = getEditingRoot(this.editingComponent, indexes)
      indexes.forEach((index) => {
        const { tag } = editNode
        const componentChildrenNum = getComponentChildrenNum(tag)
        if (editNode.children[index - componentChildrenNum]) editNode = editNode.children[index - componentChildrenNum]
      })
      //
      set(editNode.props, 'node.xy', [currentNode.posX, currentNode.posY])
      this.isEditing = true
    })
  }

  selectAllChildren() {
    if (!this.editingPaths[0]) {
      return
    }
    const allPaths = []
    this.editingPaths.forEach((editingPath) => {
      const childrenIndex = this.getChildrenIndex(editingPath)
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      currentNode.children.forEach((child, index) => {
        const childPath = `${editingPath}-${index}`
        allPaths.push(childPath)
      })
    })
    this.editingPaths = allPaths
    this.updateArrowPosition()
  }

  toggleSelectedNode() {
    if (!this.editingPaths[0]) {
      return
    }
    this.editingPaths.forEach((editingPath) => {
      const childrenIndex = this.getChildrenIndex(editingPath)
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      currentNode.active = !currentNode.active
      const indexes = [...childrenIndex]
      // console.log('editingComponent', this.editingComponent, indexes)
      let editNode = getEditingRoot(this.editingComponent, indexes)
      indexes.forEach((index) => {
        const { tag } = editNode
        const componentChildrenNum = getComponentChildrenNum(tag)
        if (editNode.children[index - componentChildrenNum]) editNode = editNode.children[index - componentChildrenNum]
      })
      const active = currentNode.active === false ? false : undefined
      set(editNode.props, 'node.active', active)
      this.isEditing = true
    })
  }

  changeSelectPath(paths: string[]) {
    console.log('changeSelectPath', paths)
    this.editingPaths = paths
    this.updateArrowPosition()
  }

  updateArrowPosition() {
    if (this.editingPaths[0]) {
      const childrenIndex = this.getChildrenIndex(this.editingPaths[0])
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      this.arrowContainerNode.position = currentNode.parent.convertToWorldSpace(currentNode.position)
    }
  }

  onTouchMove(touch: Touch) {
    if (this.questionContainerNode.active) return
    const { x, y } = touch.getDelta()
    if (!this.editingPaths[0] || this.isMiddleMouse) {
      this.drawNode.posX += x
      this.drawNode.posY += y
      this.borderNode.position = this.drawNode.position
      setLastSceneX(this.drawNode.posX)
      setLastSceneY(this.drawNode.posY)
    } else {
      this.moveSelectedNode(x / this.drawNode.scale, y / this.drawNode.scale)
    }
    this.updateArrowPosition()
  }

  render() {
    const scene = instantiate(SceneComponent as any)
    scene.addComponent(this)
    const touch = scene.addComponent(instantiate(TouchEventRegister))
    touch.props.onTouchMove = this.onTouchMove.bind(this)
    this.start()
    return this
  }
}

registerSystem(PreviewScene as any)
