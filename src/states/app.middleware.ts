import { sendRequest } from 'app/app.ipc';
import { setLastRootFolder } from 'data/AppData';
import { Dispatch } from 'react';
import { toast } from 'react-hot-toast';
import { GEN_COMPONENT_REQUEST, GEN_PROP_TYPES_REQUEST, GET_FOLDER_FILES, LOAD_COMPONENT_REQUEST, NEW_COMPONENT, NEW_PAGE, RE_NAME_COMPONENT } from 'shared/constant.message';
import { AppAction } from './app.action';
import { EXECUTE_COMMAND, GEN_COMPONENT, GEN_PROP_TYPES, GET_FILES, GET_FILES_SUCCESS, LOAD_COMPONENT, LOAD_COMPONENT_SUCCESS } from './app.constant';

export type MiddlewareKey = AppAction['type'];

export const applyMiddleware =
  (dispatch: Dispatch<AppAction>) => async (action: AppAction) => {
    // registeredMiddleware[action.type](dispatch, action);
    let hadMiddleware = true;
    switch (action.type) {
      case GET_FILES: {
        const data: any = await sendRequest({
          key: GET_FOLDER_FILES,
          src: action.src
        });
        if (data.error) {
          toast.error(data.message);
          return;
        }
        setLastRootFolder(action.src);
        dispatch({ type: GET_FILES_SUCCESS, data });
        break;
      }
      case LOAD_COMPONENT: {
        const data: any = await sendRequest({
          key: LOAD_COMPONENT_REQUEST,
          path: action.path
        });
        dispatch({ type: LOAD_COMPONENT_SUCCESS, data });
        break;
      }
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
