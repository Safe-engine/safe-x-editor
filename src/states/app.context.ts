import { createContext, Dispatch, useContext } from 'react';
import { createActions } from './actions';
import { AppAction } from './app.action';
import { AppState, initialState } from './app.reducer';

interface ContextProps {
  appState: AppState,
  appDispatch: Dispatch<AppAction>,
  useSelector<D>(cb?: (state?: AppState) => D): D,
};

export const AppContext = createContext<ContextProps>({
  appState: initialState,
  appDispatch: null,
  useSelector: null,
});

export const AppContextProvider = AppContext.Provider;

export function useSelector<D>(sel: (state?: AppState) => D) {
  const { useSelector } = useContext(AppContext);
  return useSelector<D>(sel)
}

export function useDispatch() {
  const { appDispatch } = useContext(AppContext);
  return appDispatch
}

export function useActions() {
  const { appDispatch } = useContext(AppContext);
  return createActions(appDispatch)
}
