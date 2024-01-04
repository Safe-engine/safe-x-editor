import { createContext, Dispatch } from 'react';
import { AppState, initialState } from './app.reducer';
import { AppAction } from './app.action';

interface ContextProps {
  appState: AppState,
  appDispatch: Dispatch<AppAction>,
  useSelector: Function,
};

export const AppContext = createContext<ContextProps>({
  appState: initialState,
  appDispatch: () => { },
  useSelector: () => { },
});

export const AppContextProvider = AppContext.Provider;