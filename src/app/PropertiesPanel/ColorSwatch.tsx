import { useEffect, useRef } from "react";

function colorToHex([red = 0, green = 0, blue = 0]: number[]) {
  return `#${[red, green, blue].map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, '0')).join('')}`;
}

export function ColorSwatch({ color, onChange }: { color: number[]; onChange: (hex: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hex = colorToHex(color);

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = hex;
  }, [hex]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const handleChange = () => onChange(input.value);
    input.addEventListener('change', handleChange);
    return () => input.removeEventListener('change', handleChange);
  }, [onChange]);

  return <input
    ref={inputRef}
    aria-label='Edit color'
    className='h-8 w-7 cursor-pointer rounded-sm border border-[#111] bg-transparent p-0'
    type='color'
    defaultValue={hex}
  />;
}
