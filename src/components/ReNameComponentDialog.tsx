import TextField from 'base/TextField';
import DialogWrap from 'components/DialogWrap';
import { useContext, useState } from 'react';
import { AppContext } from 'states/app.context';
import { selectRootFolder } from 'states/app.selectors';

const ReNameComponentDialog = ({ isOpen, setOpen, componentPath }) => {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const rootFolder = useSelector(selectRootFolder);
  const [newName, setNewName] = useState('');

  function onClickConfirmAction() {
    // dispatch(executeFileCommandAction(RE_NAME_COMPONENT, { newName, componentPath }, rootFolder));
    setOpen(false);
  }

  const handleChange = (setter) => (evt) => {
    setter(evt.target.value);
  };

  return (
    <DialogWrap
      className="ReNameComponentDialog"
      isOpen={isOpen}
      setOpen={setOpen}
      onClickSuccess={onClickConfirmAction}
      title="Re name Component"
      successLabel="Re name"
    >
      <TextField
        required
        id="outlined-helperText"
        label="New Name"
        value={newName}
        onChange={handleChange(setNewName)}
        variant="outlined"
        fullWidth
      />
    </DialogWrap>
  );
};

export default ReNameComponentDialog;
