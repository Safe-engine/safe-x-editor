import { dialog, getCurrentWindow } from 'helper/electronRemote';
import { useRef } from 'react';
import { FaRegFolderOpen } from "react-icons/fa6";
import Button from './Button';
import Label from './Label';
type Props = {
  onChosenFolder: Function;
  isFolder?: boolean;
  label?: string;
  title?: string;
  selectedFile: string;
}

const FileChooser = ({
  onChosenFolder,
  isFolder,
  label,
  title,
  selectedFile,
}: Props) => {
  const inputFileRef = useRef(null);

  const selectFileCallback = (fileNames) => {
    if (fileNames === undefined) {
      console.log('No file selected');
    } else {
      console.log('file selected', fileNames);
      onChosenFolder(fileNames);
    }
  };

  const onClickSource = () => {
    const files = dialog.showOpenDialogSync(getCurrentWindow(), {
      title: isFolder ? 'Select the a folder.' : 'Select the a file.',
      properties: [isFolder ? 'openDirectory' : 'openFile']
    });
    if (files)
      selectFileCallback(files[0]);
  };

  const handleChangeSource = (event) => {
    onChosenFolder(event.target.value || '');
  };

  return (
    <Label className="flex">
      <Button onClick={onClickSource} />
      <div className="ml-2 my-auto">
        <FaRegFolderOpen />
        {title || label}
        {selectedFile}</div>
    </Label>
  );
};

export default FileChooser;
