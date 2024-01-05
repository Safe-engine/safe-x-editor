import SelectBox from '../base/SelectBox';
import React, { useMemo } from 'react';
import { addNoneItem } from 'helper/utils';
import { NONE_ITEM } from 'helper/constants';

type ColorSelectorProps = {
  title?: string;
  type?: string;
  dataKey?: string;
  value?: string;
  onChange?: Function;
  onDeleteProp?: Function;
  items: Array<string | number>;
};

function ValueSelector({
  title,
  type,
  items = [],
  value = '',
  dataKey = '',
  onChange,
  onDeleteProp,
}: ColorSelectorProps) {
  const separated = useMemo(() => value.split('-')[1] || NONE_ITEM, [value]);

  function onSelectedChange(selected) {
    if (selected === NONE_ITEM) {
      onDeleteProp(dataKey || type);
    } else {
      onChange(dataKey || type, `${type}-${selected}`);
    }
  }

  return (
    <div className="flex">
      <div className="w-20 text-left">{title || type}</div>
      <SelectBox
        items={addNoneItem(items)}
        selected={separated}
        setSelected={onSelectedChange}
      />
    </div>
  );
}

export default ValueSelector;
