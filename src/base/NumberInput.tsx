import clsx from 'clsx';
import lodash from 'lodash';
import { FaMinus, FaPlus } from "react-icons/fa";
import { handleChangeNumber } from '../helper/utils';

type Props = {
  label: string,
  value?: number,
  defaultValue?: number,
  onChange: Function,
  min?: number,
  max?: number,
  postfix?: string,
  isShowButton?: boolean,
  isFullWidth?: boolean,
  step?: number
};

const NumberInput = ({
  label,
  value,
  defaultValue,
  onChange,
  min = 0,
  max,
  postfix,
  isShowButton,
  isFullWidth,
  step = 1
}: Props) => {
  function onChangeValue(valStr = 1) {
    onChange(valStr);
  }

  function onClickPlus() {
    const num = value + step;
    if (num >= min && num <= max) {
      onChange(num);
    }
  }

  function onClickMinus() {
    const num = value - step;
    if (num >= min && num <= max) {
      onChange(num);
    }
  }

  return (
    <div className={clsx('space-x-2 flex', { 'w-full': isFullWidth })}>
      <div className='text-white w-12 text-sm'>{label}</div>
      <div className='flex rounded-md bg-green-300'>
        {isShowButton && (
          <FaMinus className='my-auto'
            onClick={onClickMinus}
            height={25}
          />
        )}
        <input
          className={clsx(
            'px-1',
            isShowButton ? 'w-16 text-center' : 'w-16',
          )}
          type="number"
          step={step}
          min={`${min}`}
          max={`${max}`}
          value={value && lodash.round(value, 2)}
          defaultValue={defaultValue}
          onChange={handleChangeNumber(onChangeValue)}
        />
        {isShowButton && (
          <FaPlus className='my-auto'
            onClick={onClickPlus}
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
