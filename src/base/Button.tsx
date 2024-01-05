import React, { ReactNode, useContext } from 'react'
import tw from 'tailwind-styled-components';

const Button = tw.button`py-2 px-4  bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 focus:ring-offset-indigo-200 text-white w-full transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2  rounded-lg`

export default Button;
