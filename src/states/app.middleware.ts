import { Dispatch } from 'react';
<<<<<<< HEAD
import { toast } from 'react-hot-toast';
import { sendRequest } from '../app/app.ipc';
import { GEN_COMPONENT_REQUEST, GEN_PROP_TYPES_REQUEST, GET_FOLDER_FILES, NEW_COMPONENT, NEW_PAGE, RE_NAME_COMPONENT } from '../shared/constant.message';
=======
>>>>>>> d99c634 (refactor state)
import { createMiddleware } from './actions';

export const applyMiddleware =
  (dispatch: Dispatch<any>) => async (action: any) => {
    const middlewares = createMiddleware(dispatch);
    if (middlewares[action.type]) {
      middlewares[action.type](...action.data);
    }
    dispatch(action);
  };
