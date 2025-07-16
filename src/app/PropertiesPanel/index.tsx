import pathUtils from 'path-browserify';
import { useContext, useState } from 'react';
import { AppContext } from '../../states/app.context';
import { selectSelectedFilePath } from '../../states/app.selectors';
import NodeProps from './NodeProps';

export default function PropertiesPanel() {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const filePath = useSelector(selectSelectedFilePath);
  const [openConfirmDeleteComponent, setOpenConfirmDeleteComponent] = useState(false);
  const [openRenameComponent, setOpenRenameComponent] = useState(false);
  const [createPath, setCreatePath] = useState('');
  const [openCreateComponent, setOpenCreateComponent] = useState(false);
  const [isOpenNewState, setOpenNewState] = useState(false);

  function getComponentName(path) {
    let name = pathUtils.basename(path)
      .replace('.js', '')
      .replace('.tsx', '');
    if (name === 'index') {
      name = pathUtils.dirname(path);
    }
    return name;
  }

  function onDragEnd(e) {
    // console.log('comp', e.fromComponent.element())
    if (e.fromComponent === e.toComponent && e.fromIndex === e.toIndex) {
      return;
    }
    const nodeElementFrom = e.fromComponent.element().querySelectorAll('.dx-treeview-node')[e.fromIndex];
    const fromNode = nodeElementFrom.getAttribute('data-item-id');
    const nodeElementTo = e.toComponent.element().querySelectorAll('.dx-treeview-node')[e.toIndex];
    const toNode = nodeElementTo.getAttribute('data-item-id');
    let imported = pathUtils.relative(pathUtils.dirname(filePath), fromNode)
      .replace(/\.[^/.]+$/, '');
    let name = getComponentName(fromNode);
    let nameTo = getComponentName(filePath);
    if (imported === nameTo) {
      imported = undefined;
    } else if (!imported.startsWith('.')) {
      imported = `./${imported}`;
    }
    imported = `import ${name} from '${imported}';`;
    // console.log('fromNode', fromNode, toNode, nameTo, imported)
    // dispatch(addNode({ tag: name, imported, expanded: true }, toNode));
  }

  return (
    <div className=''>
      <div className='flex h-screen'>
        <div className='w-full'>
          <div className='py-1 text-orange-50 font-bold text-center border-cool-gray-300 border-b'>Components</div>
          {/* {Object.entries(componentPropTypes)
            .map(([name, value]) => {
              return <PropDisplay name={name} data={value} onChangePropData={onChangePropData} key={name} />;
            })} */}
          <NodeProps />
          {/* <div className='fixed bottom-0 flex justify-around px-4 w-[300px]'>
            <CheckBox text='Auto save'
              value={isAutoSave}
              onValueChange={onChangeAutoSave}></CheckBox>
            {!isAutoSave &&
              <GreenButton
                className=''
                onClick={onClickGenPropTypes}
              >
                {`Save ${isChangeState ? '*' : ''}`}
              </GreenButton>
            }
          </div> */}
        </div>
      </div>
    </div>
  );
}
