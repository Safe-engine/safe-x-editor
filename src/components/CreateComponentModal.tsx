<<<<<<< HEAD
import { RadioGroup } from "@headlessui/react";
import { useContext, useEffect, useState } from "react";
import Checkbox from "../base/Checkbox";
import FormControlLabel from "../base/FormControlLabel";
import TextField from "../base/TextField";
import { handleChange, handleCheck } from "../helper/utils";
import { NEW_COMPONENT, NEW_PAGE } from "../shared/constant.message";
import { executeFileCommandAction } from "../states/app.action";
import { AppContext } from "../states/app.context";
import { selectRootFolder } from "../states/app.selectors";
import DialogWrap from "./DialogWrap";
=======

import Checkbox from 'base/Checkbox';
import FormControlLabel from 'base/FormControlLabel';
import RadioGroup from 'base/RadioGroup';
import TextField from 'base/TextField';
import DialogWrap from 'components/DialogWrap';
import { handleChange, handleCheck } from 'helper/utils';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from 'states/app.context';
import { selectRootFolder } from 'states/app.selectors';
>>>>>>> d99c634 (refactor state)

const CreateComponentModal = ({ isOpen, setOpen, createPath }) => {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const rootFolder = useSelector(selectRootFolder);
  const [componentName, setComponentName] = useState('');
  const [params, setParams] = useState('');
  const [listState, setListState] = useState('');
  const [styleType, setStyleType] = useState('tailwind');
  const [listStateDefault, setListStateDefault] = useState('');
  const [isUseRedux, setIsUseRedux] = useState(false);
  const [isWithMemo, setIsWithMemo] = useState(false);
  const [isUseInject, setIsUseInject] = useState(false);
  const [isUseTranslate, setIsUseTranslate] = useState(false);
  const [isExtendsChildren, setIsExtendsChildren] = useState(false);
  const [isExtendsClassName, setIsExtendsClassName] = useState(false);
  const [isCreatePage, setIsCreatePage] = useState(false);
  const [isContainerComponent, setIsContainerComponent] = useState(false);

  useEffect(() => {
    if (createPath.includes('/pages')) {
      setIsCreatePage(true)
    } else if (createPath.includes('/containers')) {
      setIsContainerComponent(true)
    }
  }, [createPath]);

  const onClickCreateAction = () => {
    setOpen(false);
    const data = {
      rootFolder,
      path: createPath,
      name: componentName,
      props: params,
      isUseRedux,
      isWithMemo,
      isUseInject,
      isUseTranslate,
      listState,
      listStateDefault,
      styleType,
      isExtendsChildren,
      isExtendsClassName,
      isCreatePage,
      isContainerComponent,
    };
    if (isCreatePage) {
      data.path = rootFolder;
      // dispatch(executeFileCommandAction(NEW_PAGE, data, rootFolder));
    } else {
      // dispatch(executeFileCommandAction(NEW_COMPONENT, data, rootFolder));
    }
  };

  return (
    <DialogWrap
      className="CreateComponentModal"
      isOpen={isOpen}
      setOpen={setOpen}
      onClickSuccess={onClickCreateAction}
      title="Create new Component"
      successLabel="Create"
    >
      <>
        <div className='flex w-full'>
          <TextField
            required
            id="outlined-helperText"
            label="Name"
            value={componentName}
            onChange={handleChange(setComponentName)}
            variant="outlined"
            fullWidth
          />
          <FormControlLabel
            control={(
              <Checkbox
                checked={isCreatePage}
                onChange={handleCheck(setIsCreatePage)}
                name="Create Page"
                color="primary"
              />
            )}
            label="Create Page"
          />
          <FormControlLabel
            control={(
              <Checkbox
                checked={isContainerComponent}
                onChange={handleCheck(setIsContainerComponent)}
                name="Container Component"
                color="primary"
              />
            )}
            label="Container Component"
          />
        </div>

        <TextField
          id="outlined-helperText"
          label="Properties"
          value={params}
          onChange={handleChange(setParams)}
          helperText="Props:(separate by comma &quot;,&quot;)"
          variant="outlined"
          fullWidth
        />
        <TextField
          id="outlined-helperText"
          label="States"
          value={listState}
          onChange={handleChange(setListState)}
          variant="outlined"
          fullWidth
        />
        <TextField
          id="outlined-helperText"
          label="Default States"
          value={listStateDefault}
          onChange={handleChange(setListStateDefault)}
          variant="outlined"
          fullWidth
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={isUseRedux}
              onChange={handleCheck(setIsUseRedux)}
              name="Use redux"
              color="primary"
            />
          )}
          label="Use redux"
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={isUseInject}
              onChange={handleCheck(setIsUseInject)}
              name="Use Inject"
              color="primary"
            />
          )}
          label="Use Inject"
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={isUseTranslate}
              onChange={handleCheck(setIsUseTranslate)}
              name="Use Translate"
              color="primary"
            />
          )}
          label="Use Translate"
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={isWithMemo}
              onChange={handleCheck(setIsWithMemo)}
              name="With memo"
              color="primary"
            />
          )}
          label="With memo"
        />
        <br />
        <div className="fieldset">
          <div className="legend">Style type</div>
          <RadioGroup
            aria-label="style"
            name="style1"
            // options={['css', 'scss', 'tailwind']}
            value={styleType}
            // setValue={setStyleType}
          />
        </div>
        <br />
        <div className="fieldset">
          <div className="legend">Extends</div>
          <FormControlLabel
            control={(
              <Checkbox
                checked={isExtendsChildren}
                onChange={handleCheck(setIsExtendsChildren)}
                name="children"
                color="primary"
              />
            )}
            label="children"
          />
          <FormControlLabel
            control={(
              <Checkbox
                checked={isExtendsClassName}
                onChange={handleCheck(setIsExtendsClassName)}
                name="className"
                color="primary"
              />
            )}
            label="className"
          />
        </div>
      </>
    </DialogWrap>
  );
};

export default CreateComponentModal;
