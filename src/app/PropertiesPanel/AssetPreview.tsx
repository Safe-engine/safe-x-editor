import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Assets } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import SelectBox from "../../base/SelectBox";
import { useSelector } from "../../states/app.context";
import { selectPreviewAsset } from "../../states/app.selectors";
import { createPixiApp } from "../SceneView/pixi";

function AssetPreview() {
  const data = useSelector(selectPreviewAsset)
  const { key, name, type, value } = data;
  const canvasRef = useRef(null)
  const appRef = useRef(null)
  const [animationsList, setAnimations] = useState([])
  const [skinsList, setSkins] = useState([])
  const [selectedAnimation, setSelectedAnimation] = useState('')
  const [selectedSkin, setSelectedSkin] = useState('')

  useEffect(() => {
    setTimeout(() => {
      createPixiApp({ canvasId: 'previewCanvas', backgroundColor: 0x506260 }).then(app => {
        appRef.current = app
        console.log('createPixiApp:', appRef.current.stage)
      })
    }, 100)
  }, [canvasRef.current])

  useEffect(() => {
    console.log('loadPixiSpine:', value, appRef.current)
    if (!value || !appRef.current) return;
    async function loadSpine() {
      const { atlas, skeleton, texture } = value
      Assets.add({ alias: `ske${key}`, src: skeleton })
      Assets.add({ alias: `texJson${key}`, src: atlas })
      await Assets.load([`ske${key}`, `texJson${key}`])
      const spine = Spine.from({ skeleton: `ske${key}`, atlas: `texJson${key}` })
      const { width, height, animations, skins } = spine.skeleton.data
      // canvasRef.current.width = width
      // canvasRef.current.height = height
      const animationsList = animations.map(a => a.name)
      const skinsList = skins.map(a => a.name)
      setAnimations(animationsList)
      setSelectedAnimation(animationsList[0])
      setSkins(skinsList)
      setSelectedSkin(skinsList[0])
      spine.state.setAnimation(0, animationsList[0], true)
      spine.x = canvasRef.current.width * .5
      spine.y = canvasRef.current.height * 0.8
      spine.scale.set(400 / width, 400 / height)
      appRef.current.stage.addChild(spine)
    }
    if (type === 'spine') {
      appRef.current.stage.removeChildren()
      loadSpine()
    }
  }, [type, value, appRef.current])

  function onSelectAnimation(name) {
    if (!value || !appRef.current) return;
    setSelectedAnimation(name)
    console.log('onSelectAnimation:', appRef.current)
    appRef.current.stage.children[0].state.setAnimation(0, name, true)
  }

  function onSelectSkin(name) {
    if (!value || !appRef.current) return;
    setSelectedSkin(name)
    console.log('onSelectSkin:', appRef.current)
    appRef.current.stage.children[0].state.setSkin(name)
  }

  return <div className='w-full h-full border-cool-gray-300 last:border-t border-b p-2' >
    <div className='text-orange-600 my-auto'>{name}</div>
    {type === 'spine' &&
      <div className='text-green-800 justify-start my-auto'>
        <div className="flex">
          <div className='text-blue-100 my-auto text-sm'>Animations:</div>
          <SelectBox items={animationsList}
            selected={selectedAnimation}
            setSelected={onSelectAnimation} />
          <div className='text-blue-100 my-auto text-sm'>Skins:</div>
          <SelectBox items={skinsList}
            selected={selectedSkin}
            setSelected={onSelectSkin} />
        </div>
        <canvas className='w-full h-full' id="previewCanvas" ref={canvasRef} width={400} height={400} />
      </div>
    }
    {
      type === 'spriteFrame' &&
      <div className='my-auto flex'>
        <img src={value} />
      </div>
    }
  </div >;
}

export default AssetPreview;
