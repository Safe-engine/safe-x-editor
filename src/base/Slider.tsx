import React, { FormEventHandler } from 'react';
import ReactSlider from 'react-slider'
import tw from 'tailwind-styled-components';

type Props = {
  onChange: ((checked: boolean) => void) | (FormEventHandler<HTMLButtonElement> & ((checked: boolean) => void));
  name?: string;
  className?: string;
  color?: string;
  value: number | number[];
  max?: number;
  min?: number;
}
const StyledSlider = tw(ReactSlider)`
    w-full h-6
`;

const StyledThumb = tw.div`
    h-6 w-6 text-center bg-gray-800 rounded-full text-white cursor-grab
`;

const Thumb = (props, state) => <StyledThumb {...props}>{state.valueNow}</StyledThumb>;

const StyledTrack = tw.div`
    t-0 b-0 rounded-full h-6
    ${props => (props.index === 2 ? 'bg-red-500' : props.index === 1 ? 'bg-blue-400' : 'bg-gray-400')};
`;

const Track = (props, state) => <StyledTrack {...props} index={state.index} />;

const StyledContainer = tw.div`
    w-full pr-4 overflow-auto border-gray-600
`;

function Slider({
  name,
  max,
  min,
  value,
  onChange,
  className,
}: Props) {
  return <StyledContainer>
    <StyledSlider
      max={max}
      min={min}
      value={value}
      onChange={onChange}
      className={className}
      defaultValue={[50, 75]}
      renderTrack={Track} renderThumb={Thumb} />
  </StyledContainer>
}

export default Slider;