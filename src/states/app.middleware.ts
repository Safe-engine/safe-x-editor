import { Dispatch } from 'react';
import { toast } from 'react-hot-toast';
import { sendRequest } from '../app/app.ipc';
import { GEN_COMPONENT_REQUEST, GEN_PROP_TYPES_REQUEST, GET_FOLDER_FILES, NEW_COMPONENT, NEW_PAGE, RE_NAME_COMPONENT } from '../shared/constant.message';
import { createMiddleware } from './actions';
import { AppAction } from './app.action';
import { EXECUTE_COMMAND, GEN_COMPONENT, GEN_PROP_TYPES, GET_FILES_SUCCESS } from './app.constant';

export type MiddlewareKey = AppAction['type'];

export const applyMiddleware =
  (dispatch: Dispatch<AppAction>) => async (action: any) => {
    let hadMiddleware = true;
    const middlewares = createMiddleware(dispatch);
    if (middlewares[action.type]) {
      middlewares[action.type](...action.data);
    }
    switch (action.type) {
      case GEN_COMPONENT: {
        const data: any = await sendRequest({
          key: GEN_COMPONENT_REQUEST,
          ...action
        });
        toast.success('Gen React Component Success');
        break;
      }
      case GEN_PROP_TYPES: {
        const data: any = await sendRequest({
          key: GEN_PROP_TYPES_REQUEST,
          ...action
        });
        toast.success('Gen React Prop types Success');
        break;
      }
      case EXECUTE_COMMAND: {
        await sendRequest({
          key: (action.command as any),
          ...action.data
        });
        if ([NEW_PAGE, NEW_COMPONENT, RE_NAME_COMPONENT].includes(action.command)) {
          const data: any = await sendRequest({
            key: GET_FOLDER_FILES,
            src: action.data.rootFolder
          });
          dispatch({ type: GET_FILES_SUCCESS, data });
        }
        toast.success('Create Action Success');
        break;
      }

      default:
        hadMiddleware = false;
        break;
    }
    if (hadMiddleware) {
      console.log('hadMiddleware', action);
    }
    dispatch(action);
  };
