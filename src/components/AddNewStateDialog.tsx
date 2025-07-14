
import Checkbox from 'base/Checkbox';
import FormControlLabel from 'base/FormControlLabel';
import TextField from 'base/TextField';
import DialogWrap from 'components/DialogWrap';
import { useContext, useState } from 'react';
import { AppContext } from 'states/app.context';
import { selectRootFolder } from 'states/app.selectors';

const AddNewStateDialog = ({ isOpen, setOpen, createPath }) => {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const rootFolder = useSelector(selectRootFolder);
  const [actionName, setActionName] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [isUseEffect, setIsUseEffect] = useState(false);

  const handleChange = (setter) => (evt) => {
    setter(evt.target.value);
  };

  const handleCheck = (setter) => (evt) => {
    setter(evt.target.checked);
  };

  const onClickCreateAction = () => {
    setOpen(false);
    const data = {
      path: createPath,
      name: actionName,
      defaultValue,
      isUseEffect,
    };
    // dispatch(executeFileCommandAction(ADD_NEW_STATE, data, rootFolder));
  };

  return (
    <DialogWrap
      className="AddNewStateDialog"
      isOpen={isOpen}
      setOpen={setOpen}
      onClickSuccess={onClickCreateAction}
      title="Add new state"
      successLabel="Create"
    >
      <>
        <TextField
          required
          id="outlined-helperText"
          label="State Name"
          value={actionName}
          onChange={handleChange(setActionName)}
          variant="outlined"
          fullWidth
        />
        <TextField
          id="outlined-helperText"
          label="DefaultValue"
          value={defaultValue}
          onChange={handleChange(setDefaultValue)}
          helperText="DefaultValue:(separate by comma &quot;,&quot;)"
          variant="outlined"
          fullWidth
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={isUseEffect}
              onChange={handleCheck(setIsUseEffect)}
              name="With useEffect"
              color="primary"
            />
          )}
          label="With useEffect"
        />
      </>
    </DialogWrap>
  );
};

export default AddNewStateDialog;
