import React, { useContext, useState } from 'react';
import { AppContext } from 'states/app.context';
import { selectComponentTree, selectEditingClassName, selectSelectedFilePath } from 'states/app.selectors';
import { genClassName, updateEditingTagClass } from 'states/app.action';
import { objectToClassName } from 'helper/reactUtils';
import ColorPicker from './ColorPicker';
import SelectBox from 'base/SelectBox';
import {
  bgTypes, bordersList, displayList, marginsList, measuresList,
  textAlignsList,
  positionList, roundedList, textSizesList, whList
} from 'helper/constants';
import { getIsAutoSaveGenComp } from 'data/AppData';
import tw from 'tailwind-styled-components';
import ValueSelector from './ValueSelector';
import BorderSelector from './BorderSelector';

const TitleBlock = tw.div`border-t border-zinc-800 my-1 py-1 font-bold`;

function StyleProperties() {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const selectedEditingClassName = useSelector(selectEditingClassName);
  const filePath = useSelector(selectSelectedFilePath);
  const treeData = useSelector(selectComponentTree);
  const {
    bg, gradientType, from, to, via, textColor,
    p, px, py, pt, pr, pb, pl,
    m, mx, my, mt, mr, mb, ml,
    w, h, rounded, textSize, textAlign,
    display, position,
    b, bx, by, bt, br, bb, bl,
    bc, bxc, byc, btc, brc, bbc, blc,
  } = selectedEditingClassName;
  const [bgType, setBgType] = useState(gradientType || bgTypes[0]);

  function onChangeProp(type, value) {
    console.log('onChangeProp', type, value);
    dispatch(updateEditingTagClass(objectToClassName({ ...selectedEditingClassName, [type]: value })));
    if (getIsAutoSaveGenComp()) {
      dispatch(genClassName(treeData[0], filePath, 'tailwind'));
    }
  }

  function onDeleteProp(type) {
    delete selectedEditingClassName[type];
    dispatch(updateEditingTagClass(objectToClassName({ ...selectedEditingClassName })));
    if (getIsAutoSaveGenComp()) {
      dispatch(genClassName(treeData[0], filePath, 'tailwind'));
    }
  }

  function onChangeBgType(type) {
    setBgType(type);
    if (bgType !== bgTypes[0]) {
      onChangeProp('bgType', type);
    } else {
      onDeleteProp('bgType');
    }
  }

  return (
    <div className='w-full border-r bg-gray-200 border-gray-800 p-2 overflow-y-scroll h-[95vh] flex space-x-4'>
      <div>
        <TitleBlock className='font-bold'>Background:</TitleBlock>
        <div className='flex'>
          <SelectBox items={bgTypes} selected={bgType} setSelected={onChangeBgType} />
        </div>
        {bgType !== bgTypes[0] ?
          <div className='ml-4'>
            <ColorPicker title='From' type='from' onChange={onChangeProp} value={from} onDeleteProp={onDeleteProp} />
            <ColorPicker title='To' type='to' onChange={onChangeProp} value={to} onDeleteProp={onDeleteProp} />
            <ColorPicker title='Via' type='via' onChange={onChangeProp} value={via} onDeleteProp={onDeleteProp} />
          </div>
          :
          <div className='ml-4'>
            <ColorPicker type='bg' onChange={onChangeProp} value={bg} onDeleteProp={onDeleteProp} />
          </div>
        }
        <TitleBlock>Text:</TitleBlock>
        <ColorPicker dataKey='textColor' title='Color' type='text' onChange={onChangeProp} value={textColor} onDeleteProp={onDeleteProp} />
        <ValueSelector title='Size' type='text' dataKey='textSize' items={textSizesList} value={textSize} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        <ValueSelector title='Align' type='text' dataKey='textAlign' items={textAlignsList} value={textAlign} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        <TitleBlock>Padding:</TitleBlock>
        {!px && !py && !pt && !pr && !pb && !pl &&
          <ValueSelector type='p' items={measuresList} value={p} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!p && !pr && !pl &&
          <ValueSelector type='px' items={measuresList} value={px} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!p && !pt && !pb &&
          <ValueSelector type='py' items={measuresList} value={py} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!p && !py &&
          <ValueSelector type='pt' items={measuresList} value={pt} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!p && !px &&
          <ValueSelector type='pr' items={measuresList} value={pr} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!p && !py &&
          <ValueSelector type='pb' items={measuresList} value={pb} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!p && !px &&
          <ValueSelector type='pl' items={measuresList} value={pl} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        <TitleBlock>Margin:</TitleBlock>
        {!mx && !my && !mt && !mr && !mb && !ml &&
          <ValueSelector type='m' items={marginsList} value={m} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!m && !mr && !ml &&
          <ValueSelector type='mx' items={marginsList} value={mx} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!m && !mt && !mb &&
          <ValueSelector type='my' items={marginsList} value={my} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!m && !my &&
          <ValueSelector type='mt' items={marginsList} value={mt} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!m && !mx &&
          <ValueSelector type='mr' items={marginsList} value={mr} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!m && !my &&
          <ValueSelector type='mb' items={marginsList} value={mb} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!m && !mx &&
          <ValueSelector type='ml' items={marginsList} value={ml} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
      </div>
      <div>
        <TitleBlock>Width:</TitleBlock>
        <ValueSelector type='w' items={whList} value={w} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        <TitleBlock>Height:</TitleBlock>
        <ValueSelector type='h' items={whList} value={h} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        <TitleBlock>Display:</TitleBlock>
        <ValueSelector type='display' items={displayList} value={display} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        <TitleBlock>Border:</TitleBlock>
        {!bx && !by && !bt && !br && !bb && !bl &&
          <BorderSelector type='border' items={bordersList} value={b} borderColor={bc} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!b && !br && !bl &&
          <BorderSelector type='border-x' items={bordersList} value={bx} borderColor={bxc} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!b && !bt && !bb &&
          <BorderSelector type='border-y' items={bordersList} value={by} borderColor={byc} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!b && !by &&
          <BorderSelector type='border-t' items={bordersList} value={bt} borderColor={btc} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!b && !bx &&
          <BorderSelector type='border-r' items={bordersList} value={br} borderColor={brc} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!b && !by &&
          <BorderSelector type='border-b' items={bordersList} value={bb} borderColor={bbc} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        {!b && !bx &&
          <BorderSelector type='border-l' items={bordersList} value={bl} borderColor={blc} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        }
        <TitleBlock>Rounded:</TitleBlock>
        <ValueSelector type='rounded' items={roundedList} value={rounded} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        <TitleBlock>Position:</TitleBlock>
        <ValueSelector type='position' items={positionList} value={position} onChange={onChangeProp} onDeleteProp={onDeleteProp} />
        <TitleBlock>Transition:</TitleBlock>
      </div>
    </div>
  );
}

export default StyleProperties;
