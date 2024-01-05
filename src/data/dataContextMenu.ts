import {
  ADD_DIV, ADD_TEXT_NODE,
  DELETE_NODE, DUPLICATE_NODE
} from "states/app.constant";
import {
  ADD_NEW_STATE, CREATE_ACTION, DELETE_COMPONENT,
  DUPLICATE_COMPONENT, NEW_COMPONENT, RE_NAME_COMPONENT
} from "shared/constant.message";

export const contextMenuItems = [
  { text: ADD_DIV, },
  { text: ADD_TEXT_NODE },
  { text: DUPLICATE_NODE },
  { text: DELETE_NODE },
];

export const contextMenuFilesItems = [
  { text: CREATE_ACTION, },
  { text: ADD_NEW_STATE },
  { text: NEW_COMPONENT, beginGroup: true },
  { text: RE_NAME_COMPONENT },
  { text: DUPLICATE_COMPONENT },
  { text: DELETE_COMPONENT, beginGroup: true },
];