import { ADD_NEW_STATE, CREATE_ACTION, DELETE_COMPONENT, DUPLICATE_COMPONENT, NEW_COMPONENT, RE_NAME_COMPONENT } from "../shared/constant.message";

export const contextMenuFilesItems = [
  { text: CREATE_ACTION, },
  { text: ADD_NEW_STATE },
  { text: NEW_COMPONENT, beginGroup: true },
  { text: RE_NAME_COMPONENT },
  { text: DUPLICATE_COMPONENT },
  { text: DELETE_COMPONENT, beginGroup: true },
];