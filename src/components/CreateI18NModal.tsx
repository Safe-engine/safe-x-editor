
import DialogWrap from 'components/DialogWrap';
import { executeFileCommandAction } from 'states/app.action';
import { AppContext } from 'states/app.context';
import { selectRootFolder } from 'states/app.selectors';
import KhongDau from 'khong-dau';
import words from 'lodash/words';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';
import { CREATE_I18N } from 'shared/constant.message';
import {
  getLastEngFile, getLastViFile, setLastEngFile, setLastViFile,
} from './../data/AppData';
import { toast } from 'react-hot-toast';
import TextField from 'base/TextField';
import FileChooser from 'base/FileChooser';
import Typography from 'base/Typography';
import TitleSectionModal from 'base/TitleSectionModal';
import { Button } from 'devextreme-react/button';


const { clipboard } = window;
const regexPlaceholder = /{{(.*?)}}/g;

function toI18nKey(value = '', prefix = '', suffix = '') {
  const removePlaceholder = value.replace(regexPlaceholder, '');
  const wordsList = words(KhongDau(removePlaceholder));
  let key = wordsList.join('_').toUpperCase();
  if (value.length > 30) {
    key = wordsList.slice(0, 4).join('_').toUpperCase();
  }
  return `${prefix}${key}${suffix}`;
}

function genI18nLineJson(i18NString, prefixString, suffixString) {
  const lines = i18NString.split('\n');
  const i18nLine = lines.map(value => {
    const key = toI18nKey(value, prefixString, suffixString);
    return `,\n  "${key}": "${value}"`;
  });
  return i18nLine.join('');
}

function genOneCodeLine(string, prefixString, suffixString) {
  const key = toI18nKey(string, prefixString, suffixString);
  let match;
  const placeholders = [];
  // eslint-disable-next-line no-cond-assign
  while (match = regexPlaceholder.exec(string)) {
    placeholders.push(match[1]);
  }
  if (placeholders.length) {
    return `t('${key}', { ${placeholders.join(', ')} })`;
  }
  return `t('${key}')`;
}
function getTranslateCode(i18NString, prefixString, suffixString, joinPreviewString) {
  const lines = i18NString.split('\n');
  return lines.map(line => genOneCodeLine(line, prefixString, suffixString))
    .join(joinPreviewString);
}

const CreateI18NModal = ({ isOpen, setOpen }) => {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const rootFolder = useSelector(selectRootFolder);
  const [i18NString, setI18NString] = useState('');
  const [prefixString, setPrefixString] = useState('LABEL_');
  const [suffixString, setSuffixString] = useState('');
  const [joinPreviewString, setJoinPreviewString] = useState(' : ');

  const [engFile, setEngFile] = useState('');
  const [viFile, setViFile] = useState('');

  useEffect(() => {
    setEngFile(getLastEngFile());
    setViFile(getLastViFile());
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

  const onClickCreateI18n = () => {
    setOpen(false);
    const data = {
      i18nLine: genI18nLineJson(i18NString, prefixString, suffixString),
      engFile,
      viFile,
    };
    dispatch(executeFileCommandAction(CREATE_I18N, data, rootFolder));
    setLastViFile(viFile);
    setLastEngFile(engFile);
  };

  function copyToClipBoard() {
    const preview = getTranslateCode(i18NString, prefixString, suffixString, joinPreviewString);
    clipboard.writeText(preview);
    toast.success('Copied to clipboard!');
  }

  return (
    <DialogWrap
      className="CreateI18NModal"
      isOpen={isOpen}
      setOpen={setOpen}
      onClickSuccess={onClickCreateI18n}
      title="Create new i18n string"
      successLabel="Create"
    >
      <>
        <TextField
          required
          id="outlined-helperText"
          label="I18n String (multiple lines is accepted)"
          value={i18NString}
          onChange={handleChange(setI18NString)}
          variant="outlined"
          fullWidth
          multiline
          rowsMax={4}
        />
        <TextField
          required
          id="outlined-helperText"
          label="Prefix String"
          value={prefixString}
          onChange={handleChange(setPrefixString)}
          variant="outlined"
          fullWidth
        />
        <TextField
          required
          id="outlined-helperText"
          label="Suffix String"
          value={suffixString}
          onChange={handleChange(setSuffixString)}
          variant="outlined"
          fullWidth
        />
        <TextField
          required
          id="outlined-helperText"
          label="Join String"
          value={joinPreviewString}
          onChange={handleChange(setJoinPreviewString)}
          variant="outlined"
          fullWidth
        />
        <Typography
          variant="outlined"
          fullWidth
        >
          {getTranslateCode(i18NString, prefixString, suffixString, joinPreviewString)}
          <Button icon="activefolder" onClick={copyToClipBoard} />
        </Typography>
        <TitleSectionModal label="Config destination files" />
        <FileChooser
          onChosenFolder={onChosenFolder(setEngFile)}
          selectedFile={engFile}
          label="Eng file"
        />
        <FileChooser
          onChosenFolder={onChosenFolder(setViFile)}
          selectedFile={viFile}
          label="Vi file"
        />
      </>
    </DialogWrap>
  );
};

CreateI18NModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  setOpen: PropTypes.func.isRequired,
};

export default CreateI18NModal;
