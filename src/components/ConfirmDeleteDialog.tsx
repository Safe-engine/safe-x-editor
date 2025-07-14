<<<<<<< HEAD
import { useContext } from 'react';
import { DELETE_COMPONENT } from '../shared/constant.message';
import { executeFileCommandAction } from '../states/app.action';
import { AppContext } from '../states/app.context';
import { selectRootFolder } from '../states/app.selectors';
import DialogWrap from './DialogWrap';
=======
import DialogWrap from 'components/DialogWrap';
import { useContext } from 'react';
import { AppContext } from 'states/app.context';
import { selectRootFolder } from 'states/app.selectors';
>>>>>>> d99c634 (refactor state)

const ConfirmDeleteDialog = ({ isOpen, setOpen, componentPath }) => {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const rootFolder = useSelector(selectRootFolder);

  function onClickConfirmAction() {
    // dispatch(executeFileCommandAction(DELETE_COMPONENT, componentPath, rootFolder));
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
