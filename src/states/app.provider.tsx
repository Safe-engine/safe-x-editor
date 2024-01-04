import React, { useReducer, Reducer } from 'react';
import appReducer, { initialState, AppState } from './app.reducer';
import { AppAction } from './app.action';
import { AppContextProvider } from './app.context';
import { applyMiddleware } from './app.middleware';

export const AppProvider: React.FC<any> = ({ children }) => {
  const [appState, dispatch] = useReducer<Reducer<AppState, AppAction>>(appReducer, initialState);
  const appDispatch = applyMiddleware(dispatch);
  const useSelector = (selector: (state: AppState) => any) => selector(appState);

  return (
    <AppContextProvider value={{ appState, appDispatch, useSelector }}>
      {children}
    </AppContextProvider>)
};
