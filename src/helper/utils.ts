import { NONE_ITEM } from "./constants";

export function calculateToIndex(e) {
  if (e.fromComponent !== e.toComponent || e.dropInsideItem) {
    return e.toIndex;
  }

  return e.fromIndex >= e.toIndex
    ? e.toIndex
    : e.toIndex + 1;
}

export function findNode(treeView, index) {
  const nodeElement = treeView.element().querySelectorAll('.dx-treeview-node')[index];
  if (nodeElement) {
    return findNodeById(treeView.getNodes(), nodeElement.getAttribute('data-item-id'));
  }
  return null;
}

export function findNodeById(nodes, id) {
  console.log(nodes, id);
  for (let i = 0; i < nodes.length; i += 1) {
    if (nodes[i].key === parseInt(id)) {
      return nodes[i];
    }
    if (nodes[i].children) {
      const node = findNodeById(nodes[i].children, id);
      if (node != null) {
        return node;
      }
    }
  }
  return null;
}

export function fixKeys(root) {
  let { key, items = [] } = root;
  return {
    ...root,
    key: `${key}_${Date.now()}`,
    items: items.map(fixKeys)
  };
}

export const handleChange = (setter) => (evt) => {
  setter(evt.target.value);
};

export const handleCheck = (setter) => (evt) => {
  setter(evt.target.checked);
};

export const addNoneItem = arr => [NONE_ITEM, ...arr];

export function isNumeric(str) {
  // if (typeof str !== "string") return false // we only process strings!
  return !isNaN(str) && // use type correction to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

export const borderKeysMap = {
  'border': 'b',
  'border-x': 'bx',
  'border-y': 'by',
  'border-t': 'bt',
  'border-r': 'br',
  'border-b': 'bb',
  'border-l': 'bl',
}

export function getBorderKey(key) {
  return borderKeysMap[key];
}
