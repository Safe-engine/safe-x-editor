import { Dispatch } from 'react';
import { createMiddleware } from './actions';

export const applyMiddleware =
  (dispatch: Dispatch<any>) => async (action: any) => {
    const middlewares = createMiddleware(dispatch);
    if (middlewares[action.type]) {
      middlewares[action.type](...action.data);
    }
    dispatch(action);
  };
