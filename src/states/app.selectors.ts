/**
 * The App state selectors
 */
import { createSelector } from 'reselect';
import { initialState, AppState } from 'states/app.reducer';
import Tree from '@colin-luo/tree';
import groupBy from 'lodash/groupBy';
import { classNameToObject } from 'helper/reactUtils';

const selectApp = (state: AppState) => state || initialState;

export const selectRootFolder = createSelector(
  selectApp,
  (appState) => appState.rootFolder
);

export const selectLoading = createSelector(
  selectApp,
  (appState) => appState.loading
);

export const selectError = createSelector(
  selectApp,
  (appState) => appState.error
);

export const selectFilesData = createSelector(
  selectApp,
  (appState) => appState.filesData
);

export const selectSelectedFilePath = createSelector(
  selectApp,
  (appState) => appState.filePath
);

export const selectSelectedEditingPath = createSelector(
  selectApp,
  (appState) => appState.editingPath
);

export const selectComponentTree = createSelector(
  selectApp,
  (appState) => appState.componentTree
);

export const selectPropTypes = createSelector(
  selectApp,
  (appState) => appState.componentPropTypes
);

function transformLibraryData(data) {
  const groups = groupBy(data, 'from');
  // console.log(groups);
  return Object.keys(groups).map((from) => ({
    id: from,
    text: from,
    expanded: true,
    items: groups[from].map(({ name, isSubModule }) => ({
      id: `${name},${from},${isSubModule}`,
      text: name,
    })),
  }));
}

export const selectRightData = createSelector(selectApp, (appState) => [
  {
    title: 'Components',
    tree: appState.filesData,
  },
  {
    title: 'ClassNameEditor',
    tree: appState.componentTree,
  },
  {
    title: 'Library',
    tree: transformLibraryData(appState.libraryComps),
  },
  {
    title: 'Images',
    tree: appState.images,
  },
  {
    title: 'Settings',
    tree: appState.settings,
  },
]);

export const selectEditingText = createSelector(
  selectComponentTree,
  selectSelectedEditingPath,
  (componentTree, editingPath) => {
    let tree = new Tree(componentTree, 'key', 'items');
    const node = tree.getNode(editingPath);
    return node ? node.name : '';
  }
);

export const selectSelectedEditingClassNamePath = createSelector(
  selectApp,
  (appState) => appState.editingClassNamePath
);

export const selectEditingClassName = createSelector(
  selectComponentTree,
  selectSelectedEditingClassNamePath,
  (componentTree, editingClassNamePath) => {
    let tree = new Tree(componentTree, 'key', 'items');
    const node = tree.getNode(editingClassNamePath);
    // console.log('name', editingClassNamePath, node?.name);
    return node ? classNameToObject(node.name) : {};
  }
);

export const selectSelectedNode = createSelector(
  selectApp,
  (appState) => appState.selectedNode
);
