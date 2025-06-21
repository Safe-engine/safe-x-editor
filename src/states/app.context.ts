import { createContext, Dispatch, useContext } from 'react';
import { AppAction } from './app.action';
import { AppState, initialState } from './app.reducer';

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

export function useSelector(sel) {
  const { useSelector } = useContext(AppContext);
  return useSelector(sel)
}

export function useDispatch() {
  const { appDispatch } = useContext(AppContext);
  return appDispatch
}
