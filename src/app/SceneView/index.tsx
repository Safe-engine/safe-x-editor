import { useContext, useEffect, useRef, useState } from 'react'
import ArrowControl from './ArrowControl'
import { selectComponentTree, selectEditingComponent, selectSelectedEditingPath } from 'states/app.selectors';
import { AppContext } from 'states/app.context';
import { updateEditingComponent } from 'states/app.action';

const filePath = "/Users/antn/Documents/axmol/kingdom-defense/res/Texture/building/farm.png";
export default function SceneView() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const selectedEditingComponent = useSelector(selectComponentTree);
  const divRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const treeData = useSelector(selectSelectedEditingPath);
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 })
  useEffect(() => {
    cc.game.run({
      "debugMode": 1,
      "showFPS": false,
      "frameRate": 60,
      "id": "gameCanvas",
      "renderMode": 1
    }, onStart)
  }, [])
  useEffect(() => {
    console.log('SceneView isEditing', isEditing, treeData, selectedEditingComponent)
    if (cc.director.getRunningScene()) {
      console.log('cc.director.getRunningScene()', cc.director.getRunningScene())
      cc.director.getRunningScene().children[0].x = 100;
    }
  }, [selectedEditingComponent]);
  class BootScene extends cc.Scene {
    constructor() {
      // 1. super init first
      super()
      super.ctor() // always call this for compatibility with cocos2dx JS Javascript class system
      // this.scheduleUpdate()
    }
    onEnter() {
      super.onEnter()
      const imgElement = new Image()
      imgElement.crossOrigin = 'anonymous'
      imgElement.onerror = function () {
        console.error('Image load error:', filePath);
      };
      imgElement.src = `file://${filePath}`;

      imgElement.onload = function () {
        var texture = new cc.Texture2D();
        texture.initWithElement(imgElement);
        texture.handleLoadedTexture();
        console.log('Image loaded:', filePath);
        console.log(' texture:', texture);

        var sprite = new cc.Sprite(texture);
        console.log(' sprite:', sprite);
        sprite.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
        cc.director.getRunningScene().addChild(sprite);
      };

      var fontName = "LilitaOne-Regular";
      var fontUrl = "file:///Users/antn/Documents/axmol/kingdom-defense/res/Font/LilitaOne-Regular.ttf";

      var style = document.createElement("style");
      style.type = "text/css";
      style.textContent = `
@font-face {
    font-family: '${fontName}';
    src: url('${fontUrl}');
}`;
      document.head.appendChild(style);
      document.fonts.load("10pt '" + fontName + "'").then(function () {
        var label = new cc.LabelTTF("Hello TTF Font", fontName, 32);
        label.setPosition(cc.winSize.width / 2, cc.winSize.height / 3);
        cc.director.getRunningScene().addChild(label);
      }).catch(err => {
        console.error('Font load error:', fontUrl, err);
      });

    }

    // update(dt) {
    // }
  }
  // cc._isContextMenuEnable = true
  function onStart() {
    // Pass true to enable retina display, disabled by default to improve performance
    cc.view.enableRetina(cc.sys.os === cc.sys.OS_IOS)
    // Adjust viewport meta
    // cc.view.adjustViewPort(true)
    // Setup the resolution policy and design resolution size
    cc.view.setDesignResolutionSize(640, 1320, cc.ResolutionPolicy.FIXED_WIDTH)
    // The game will be resized when browser size change
    // cc.view.resizeWithBrowserSize(true)

    cc.director.runScene(new BootScene())
    cc.loader.load(`file://${filePath}`, function (err, font) {
      if (err) {
        cc.log("Failed to load .fnt file:", err);
        return;
      }
      console.log('font:', font[0]);
      var label = new cc.Sprite(font[0]);
      label.setPosition(cc.winSize.width / 4, cc.winSize.height / 4);
      cc.director.getRunningScene().addChild(label);
    });
  }

  function onMouseUp() {
    setIsEditing(false)
  }
  function onMouseDown(event) {
    setIsEditing(true)
    setPositionStart({ x: event.clientX, y: event.clientY })
  }
  function onMouseMove(event) {
    const x = event.clientX - divRef.current.getBoundingClientRect().left
    const y = event.clientY - divRef.current.getBoundingClientRect().top
    // console.log('Mouse move:', positionStart, isEditing)
    setPosition({ x, y })
    if (!selectedEditingComponent || !isEditing) return
    const { node = {} } = selectedEditingComponent.props
    const { x: nx = 0, y: ny = 0 } = node
    dispatch(updateEditingComponent('props', {
      node: {
        ...node,
        x: nx + event.clientX - positionStart.x,
        y: ny + event.clientY - positionStart.y,
      }
    }));
  }
  // Necessary because we will have to use Greet as a component later.
  return <div ref={divRef}
    onMouseUp={onMouseUp}
    onMouseDown={onMouseDown}
    onMouseMove={onMouseMove}
    className='flex h-screen justify-center select-none w-full' style={{ width: '40vw', height: '100vh' }}>
    {/* <iframe className='w-full' style={{ height: '50vh' }} src='http://localhost:10234' /> */}
    <canvas id='gameCanvas' className='w-full h-full' />
    {/* <ArrowControl position={position} /> */}
  </div>
}
