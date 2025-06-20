import React, { useReducer } from 'react';
import { AppContextProvider } from './app.context';
import { applyMiddleware } from './app.middleware';
import appReducer, { AppState, initialState } from './app.reducer';

export const AppProvider: React.FC<any> = ({ children }) => {
  const [appState, dispatch] = useReducer(appReducer, initialState);
  const appDispatch = applyMiddleware(dispatch);
  const useSelector = (selector: (state: AppState) => any) => selector(appState);

  return (
    <AppContextProvider value={{ appState, appDispatch, useSelector }}>
      {children}
    </AppContextProvider>)
};
