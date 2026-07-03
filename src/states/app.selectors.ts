/**
 * The App state selectors
 */
import Tree from '@colin-luo/tree';
import { createSelector } from 'reselect';
import { AppState, initialState } from 'states/app.reducer';

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

export const selectResourceFilesData = createSelector(
  selectApp,
  (appState) => appState.resourceFilesData
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

export const selectComponentsCache = createSelector(
  selectApp,
  (appState) => appState.componentsCache
);

export const selectPropTypes = createSelector(
  selectApp,
  (appState) => appState.componentPropTypes
);

export const selectDesignResolution = createSelector(
  selectApp,
  (appState) => appState.settings.designedResolution
);

export const selectIsPixi = createSelector(
  selectApp,
  (appState) => appState.isPixi
);

export const selectSelectedEditingClassNamePath = createSelector(
  selectApp,
  (appState) => appState.editingClassNamePath
);

export const selectSelectedPaths = createSelector(
  selectApp,
  (appState) => appState.selectedPaths
);

export const selectSelectedNodes = createSelector(
  selectApp,
  (appState) => appState.selectedNodes
)

export const selectEditingComponent = createSelector(
  selectComponentTree,
  selectSelectedEditingClassNamePath,
  (componentTree, editingClassNamePath) => {
    let tree = new Tree(componentTree, 'id', 'children');
    const node = tree.getNode(editingClassNamePath);
    // console.log('name', editingClassNamePath, node?.name);
    return node;
  }
);

export const selectSelectedNode = createSelector(
  selectApp,
  (appState) => appState.selectedNodes[0]
);

export const selectAssets = createSelector(
  selectApp,
  (appState) => appState.assets
);

export const selectPreviewAsset = createSelector(
  selectApp,
  (appState) => appState.previewAsset
);
