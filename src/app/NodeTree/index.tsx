import { getIsAddDivText, getIsAutoSaveGenComp, setIsAutoSaveGenComp } from 'data/AppData';
import { Button } from 'devextreme-react/button';
import CheckBox from 'devextreme-react/check-box';
import ContextMenu from 'devextreme-react/context-menu';
import Sortable from 'devextreme-react/sortable';
import TreeView from 'devextreme-react/tree-view';
import pathUtils from 'path-browserify';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  addNode, deleteNode,
  duplicateNode, genComponent, selectEditingTagNode, selectEditingText
} from 'states/app.action';
import {
  ADD_DIV, ADD_TEXT_NODE,
  DELETE_NODE, DUPLICATE_NODE
} from 'states/app.constant';
import { AppContext } from 'states/app.context';
import { selectComponentTree, selectRootFolder, selectSelectedEditingClassNamePath, selectSelectedFilePath } from 'states/app.selectors';
import { contextMenuItems } from '../../data/dataContextMenu';
import TagTreeRender from './TagTreeRender';

export default function NodeTree() {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const treeData = useSelector(selectComponentTree);
  const filePath = useSelector(selectSelectedFilePath);
  const rootPath = useSelector(selectRootFolder);
  const selectedEditingClassNamePath = useSelector(selectSelectedEditingClassNamePath);
  const [selectedTreeItem, setSelectedTreeItem] = useState<any>({});
  const treeViewComponentRef = useRef(null);
  const contextMenuRef = useRef(null);
  const [styleType, setStyleType] = useState('tailwind');
  const [isChangeState, setIsChangeState] = useState(false);
  const [isAutoSave, setIsAutoSave] = useState(false);

  useEffect(() => {
    if (treeData & treeData[0]) {
      console.log('treeData', treeData)
      setIsChangeState(true);
      if (getIsAutoSaveGenComp()) {
        onClickGenComponent();
      }
      const editorSceneFile = pathUtils.join(rootPath, 'src', '.safex', 'EditingScene.tsx')
      dispatch(genComponent(treeData[0], editorSceneFile, 'tailwind'));
    }
  }, [treeData]);

  useEffect(() => {
    setIsChangeState(false);
    setIsAutoSave(getIsAutoSaveGenComp());
  }, []);

  function onClickGenComponent() {
    setIsChangeState(false);
    dispatch(genComponent(treeData[0], filePath, styleType));
  }

  function treeViewItemContextMenu(e) {
    // console.log(e.itemData)
    const contextMenu = contextMenuRef.current.instance;
    const { tag } = e.itemData;
    contextMenu.option('items[0].visible', !!tag && tag !== 'Image');
    contextMenu.option('items[1].visible', !!tag && tag !== 'Image');

    if (e.itemData.tag) {
      setSelectedTreeItem(e.itemData);
    } else {
      setSelectedTreeItem({});
    }
  }

  function onItemClick(event) {
    // console.log(event.node)
    if (!event.itemData.tag) {
      dispatch(selectEditingText(event.node.key));
    } else {
      dispatch(selectEditingTagNode(event.node.key));
    }
  }

  function onChangeAutoSave(value) {
    setIsAutoSave(value);
    setIsAutoSaveGenComp(value);
    if (getIsAutoSaveGenComp()) {
      onClickGenComponent();
    }
  }

  function contextMenuItemClick(e) {
    // console.log(selectedTreeItem);
    if (!selectedTreeItem.key) { return; }
    switch (e.itemData.text) {
      case ADD_DIV: {
        dispatch(addNode({ tag: 'div', name: 'div', expanded: true }, selectedTreeItem.key));
        break;
      }
      case ADD_TEXT_NODE:
        if (getIsAddDivText()) {
          dispatch(addNode({ tag: 'div', name: 'text', items: [{ key: `text_${Date.now()}`, name: 'text' }], expanded: true }, selectedTreeItem.key));
        } else {
          dispatch(addNode({ name: 'text' }, selectedTreeItem.key));
        }
        break;
      case DUPLICATE_NODE:
        dispatch(duplicateNode(selectedTreeItem));
        break;
      case DELETE_NODE:
        dispatch(deleteNode(selectedTreeItem));
        break;
      default:
        break;
    }
  }

  function renderTreeViewItem(item) {
    // console.log(item)
    if (!item.tag) {
      return <TagTreeRender editing={item.editing} name={item.name} />;
    }
    if (item.tag === 'Image') {
      return <span className='flex text-blue-800 font-medium'>
        <img src={`file://${rootPath}/public${item.props.src}`} alt='' className='h-4 mr-2' />
        {`"${item.props.src}"`}
      </span>;
    }
    return (<div
      className={selectedEditingClassNamePath === item.key ?
        'bg-blue-200 p-1 rounded-md' : ('')}>
      <span className='text-green-600 font-medium'>
        &lt;{item.tag}&gt;
      </span>
      <span className='text-orange-600 m-1 font-medium'>"{item.name}"</span>
    </div>
    );
  }

  return (
    <div className='h-screen' >
      <div className='drive-header dx-treeview-item'>
        <div className='dx-treeview-item-content'>
          <i className='dx-icon dx-icon-hierarchy'></i>
          {/* <span className='text-yellow-400'>{filePath.replace(rootPath, '')}</span> */}
        </div>
      </div>
      <Sortable
        id='hierarchyComponent'
        className='pb-20'
        filter='.dx-treeview-item'
        height={'100%'}
        group='shared'
        data='componentView'
        allowDropInsideItem={true}
        allowReordering={true}
      >
        <TreeView
          id='treeviewcomponentView'
          expandNodesRecursive={false}
          dataStructure='tree'
          // scrollDirection="vertical"
          ref={ctx => treeViewComponentRef.current = ctx}
          onItemContextMenu={treeViewItemContextMenu}
          itemRender={renderTreeViewItem}
          items={treeData}
          onItemClick={onItemClick}
          // width={250}
          // height={'100%'}
          // displayExpr={getTreeCompData}
          // itemKeyFn={getTreeCompData}
          // itemsExpr="children"
          keyExpr='key'
        />
      </Sortable>
      <ContextMenu
        ref={ctx => contextMenuRef.current = ctx}
        dataSource={contextMenuItems}
        width={200}
        target='#hierarchyComponent .dx-treeview-item'
        onItemClick={contextMenuItemClick} />
      <div className='fixed bottom-0 flex justify-around w-[300px]'>
        <CheckBox text='Auto save'
          value={isAutoSave}
          onValueChange={onChangeAutoSave}></CheckBox>
        {!isAutoSave &&
          <Button
            className=''
            text={`Save ${isChangeState ? '*' : ''}`}
            stylingMode='contained'
            type='danger'
            onClick={onClickGenComponent}
          />
        }
      </div>
    </div>
  );
};
