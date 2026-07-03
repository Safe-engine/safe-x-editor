import React, { ReactNode, useContext } from 'react'
import tw from 'tailwind-styled-components';

const Button = tw.button`h-8 w-full rounded-sm bg-[#333] px-3 text-center text-[11px] font-bold uppercase text-[#f3f3f3] shadow-inner transition hover:bg-[#3d3d3d] focus:outline-none focus:ring-1 focus:ring-[#4a90e2]`

export const GreenButton = tw.button`h-8 rounded-sm bg-[#304766] px-3 text-center text-[11px] font-bold uppercase text-[#f3f3f3] shadow-inner transition hover:bg-[#3a577d] focus:outline-none focus:ring-1 focus:ring-[#4a90e2]`

export default Button;
