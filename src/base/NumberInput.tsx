import parseInt from 'lodash/parseInt';
import { faMinusCircle, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import React from 'react';
import { handleChange } from '../helper/utils';

type Props = {
  label: string,
  value: string,
  onChange: Function,
  min?: number,
  max?: number,
  postfix?: string,
  isShowButton?: boolean,
  isFullWidth?: boolean,
};

const NumberInput = ({
  label,
  value,
  onChange,
  min,
  max,
  postfix,
  isShowButton,
  isFullWidth,
}: Props) => {
  function onChangeValue(valStr = '') {
    const num = parseInt(valStr);
    onChange(num);
  }

  function onClickPlus() {
    const num = parseInt(value) + 1;
    if (num >= min && num <= max) {
      onChange(num);
    }
  }

  function onClickMinus() {
    const num = parseInt(value) - 1;
    if (num >= min && num <= max) {
      onChange(num);
    }
  }

  return (
    <div className={clsx(isShowButton ? 'space-x-2 mt-1 flex' : 'w-full')}>
      <div className={clsx(isFullWidth ? 'w-full font-bold' : '')}>{label}</div>
      <div className='flex'>
        {isShowButton && (
          <FontAwesomeIcon className='mt-1'
            onClick={onClickMinus}
            icon={faMinusCircle}
            height={25}
          />
        )}
        <input
          className={clsx(
            'rounded-md px-1 border border-gray-800',
            isShowButton ? 'w-16 text-center' : 'w-32 text-right',
          )}
          type="number"
          min={`${min}`}
          max={`${max}`}
          value={value}
          onChange={handleChange(onChangeValue)}
        />
        {isShowButton && (
          <FontAwesomeIcon className='mt-1'
            onClick={onClickPlus}
            icon={faPlusCircle}
            height={25}
          />
        )}
        <div className="">{postfix}</div>
      </div>
    </div>
  );
};


NumberInput.defaultProps = {
  min: -Infinity,
  max: Infinity,
  postfix: '',
  isShowButton: true,
};

export default NumberInput;
