
import { executeFileCommandAction } from 'states/app.action';
import { AppContext } from 'states/app.context';
import { selectRootFolder } from 'states/app.selectors';
import PropTypes from 'prop-types';
import React, { useState, useEffect, useContext } from 'react';
import { CREATE_ACTION } from 'shared/constant.message';

import {
  setLastActionFile,
  setLastConstantsFile,
  setLastReducersFile,
  setLastLogicFile,
  setLastSagaFile,
  getLastActionFile,
  getLastConstantsFile,
  getLastReducersFile,
  getLastLogicFile,
  getLastSagaFile,
  getLastSelectorsFile,
  setLastSelectorsFile,
} from '../data/AppData';
import Checkbox from '../base/Checkbox';
import DialogWrap from './DialogWrap';
import FileChooser from '../base/FileChooser';
import FormControlLabel from '../base/FormControlLabel';
import Switch from '../base/Switch';
import TextField from '../base/TextField';

const CreateActionModal = ({ isOpen, setOpen, createPath }) => {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const rootFolder = useSelector(selectRootFolder);
  const [actionName, setActionName] = useState('');
  const [params, setParams] = useState('');
  const [isUseLogic, setIsUseLogic] = useState(false);
  const [isUseSaga, setIsUseSaga] = useState(true);
  const [isUseSelectors, setIsUseSelectors] = useState(false);
  const [isUseStrapi, setIsUseStrapi] = useState(true);
  const [isConfigFiles, setIsConfigFiles] = useState(false);
  const [actionsFile, setActionsFile] = useState('');
  const [constantsFile, setConstantsFile] = useState('');
  const [reducersFile, setReducersFile] = useState('');
  const [logicFile, setLogicFile] = useState('');
  const [sagaFile, setSagaFile] = useState('');
  const [selectorsFile, setSelectorsFile] = useState('');

  useEffect(() => {
    setActionsFile(getLastActionFile());
    setConstantsFile(getLastConstantsFile());
    setReducersFile(getLastReducersFile());
    setLogicFile(getLastLogicFile());
    setSagaFile(getLastSagaFile());
    setSelectorsFile(getLastSelectorsFile());
  }, []);

  const handleChange = (setter) => (evt) => {
    setter(evt.target.value);
  };

  const handleCheck = (setter) => (evt) => {
    setter(evt.target.checked);
  };

  const onChosenFolder = setter => ([src]) => {
    setter(src);
  };

  const onClickCreateAction = () => {
    setOpen(false);
    const data = {
      path: createPath,
      name: actionName,
      params,
      isUseLogic,
      isUseSaga,
      isUseSelectors,
      isUseStrapi,
      filesPath: isConfigFiles ? {
        actions: actionsFile,
        constants: constantsFile,
        reducers: reducersFile,
        logic: logicFile,
        saga: sagaFile,
        selectors: selectorsFile,
      } : {},
    };
    // console.log(data,isConfigFiles)
    dispatch(executeFileCommandAction(CREATE_ACTION, data, rootFolder));
    setLastActionFile(actionsFile || '');
    setLastConstantsFile(constantsFile || '');
    setLastReducersFile(reducersFile || '');
    setLastLogicFile(logicFile || '');
    setLastSagaFile(sagaFile || '');
    setLastSelectorsFile(selectorsFile || '');
  };

  return (
    <DialogWrap
      className='CreateActionModal'
      isOpen={isOpen}
      setOpen={setOpen}
      onClickSuccess={onClickCreateAction}
      title='Create new Action'
      successLabel='Create'
    >
      <>
        <TextField
          required
          id='outlined-helperText'
          label='Name'
          value={actionName}
          onChange={handleChange(setActionName)}
          variant='outlined'
          fullWidth
        />
        <TextField
          id='outlined-helperText'
          label='Params'
          value={params}
          onChange={handleChange(setParams)}
          helperText='Params:(separate by comma &quot;,&quot;)'
          variant='outlined'
          fullWidth
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={isUseLogic}
              onChange={handleCheck(setIsUseLogic)}
              name='Use logic'
              color='primary'
            />
          )}
          label='Use logic'
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={isUseSaga}
              onChange={handleCheck(setIsUseSaga)}
              name='Use saga'
              color='primary'
            />
          )}
          label='Use saga'
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={isUseSelectors}
              onChange={handleCheck(setIsUseSelectors)}
              name='Use selectors'
              color='primary'
            />
          )}
          label='Use selectors'
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={isUseStrapi}
              onChange={handleCheck(setIsUseStrapi)}
              name='Use strapi'
              color='primary'
            />
          )}
          label='Use strapi'
        />
        <br />
        <FormControlLabel
          control={(
            <Switch
              checked={isConfigFiles}
              onChange={setIsConfigFiles}
              name='destination'
              color='primary'
            />
          )}
          label='Config destination files'
        />
        {isConfigFiles
          && (
            <>
              <FileChooser
                onChosenFolder={setActionsFile}
                selectedFile={actionsFile}
                label='Actions file'
              />
              <FileChooser
                onChosenFolder={setConstantsFile}
                selectedFile={constantsFile}
                label='Constants file'
              />
              <FileChooser
                onChosenFolder={setReducersFile}
                selectedFile={reducersFile}
                label='Reducers file'
              />
              {isUseSelectors
                && (
                  <FileChooser
                    onChosenFolder={setSelectorsFile}
                    selectedFile={selectorsFile}
                    label='Selectors file'
                  />
                )}
              {isUseLogic
                && (
                  <FileChooser
                    onChosenFolder={setLogicFile}
                    selectedFile={logicFile}
                    label='Logic file'
                  />
                )}
              {isUseSaga
                && (
                  <FileChooser
                    onChosenFolder={setSagaFile}
                    selectedFile={sagaFile}
                    label='Saga file'
                  />
                )}
            </>
          )}
      </>
    </DialogWrap>
  );
};

CreateActionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  setOpen: PropTypes.func.isRequired,
  createPath: PropTypes.string.isRequired,
};

export default CreateActionModal;
