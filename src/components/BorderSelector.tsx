import { useMemo } from 'react';
import SelectBox from '../base/SelectBox';
import { NONE_ITEM } from '../helper/constants';
import { addNoneItem, getBorderKey } from '../helper/utils';
import ColorPicker from './ColorPicker';

type BorderSelectorProps = {
  title?: string;
  type?: string;
  value?: string;
  borderColor?: string;
  onChange?: Function;
  onDeleteProp?: Function;
  items: Array<string | number>;
};

function BorderSelector({
  title,
  type,
  items = [],
  value = '',
  borderColor = '',
  onChange,
  onDeleteProp,
}: BorderSelectorProps) {
  const separated = useMemo(() => value ? value.replace(`${type}-`, '') : NONE_ITEM,
    [value, type]);

  function onSelectedChange(selected) {
    // console.log(type, selected)
    const key = getBorderKey(type)
    if (selected === NONE_ITEM) {
      onDeleteProp(key);
    } else {
      const val = selected === '1' ? type : `${type}-${selected}`;
      onChange(key, val);
    }
  }

  function onChangeColorProp(key, selected) {
    if (selected === NONE_ITEM) {
      onDeleteProp(key);
    } else {
      onChange(key, selected);
    }
  }

  return (
    <div className="flex">
      <div className="w-20 text-left">{title || type}</div>
      <SelectBox items={addNoneItem(items)} selected={separated} setSelected={onSelectedChange} />
      <div className='mt-auto'>
        <ColorPicker dataKey={`${getBorderKey(type)}c`} title=' ' type={type}
          onChange={onChangeColorProp} value={borderColor} onDeleteProp={onDeleteProp} />
      </div>
    </div>
  );
}

export default BorderSelector;
