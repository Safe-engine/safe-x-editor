import React, { useContext } from 'react';
import DialogWrap from 'components/DialogWrap';
import { DELETE_COMPONENT } from 'shared/constant.message';
import { AppContext } from 'states/app.context';
import { selectRootFolder } from 'states/app.selectors';
import { executeFileCommandAction } from 'states/app.action';

const ConfirmDeleteDialog = ({ isOpen, setOpen, componentPath }) => {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const rootFolder = useSelector(selectRootFolder);

  function onClickConfirmAction() {
    dispatch(executeFileCommandAction(DELETE_COMPONENT, componentPath, rootFolder));
    setOpen(false);
  }

  return (
    <DialogWrap
      className="ConfirmDeleteDialog"
      isOpen={isOpen}
      setOpen={setOpen}
      onClickSuccess={onClickConfirmAction}
      title="Delete Component"
    >
      Are you sure want to delete this component?
    </DialogWrap>
  );
};

export default ConfirmDeleteDialog;
