function textureKey(value) {
  return String(value ?? '').replace(/[{}]/g, '');
}

export function removeTextureMatchingNodeSizes(nodesData, textures = [], spriteFrames = []) {
  const textureSizes = new Map();
  textures.forEach((texture) => {
    [texture.key, texture.path, texture.value].filter(Boolean).forEach((key) => textureSizes.set(key, texture.size));
  });
  const spriteFrameAssets = new Map(spriteFrames.map((spriteFrame) => [spriteFrame.key, spriteFrame.value]));

  function normalize(node) {
    if (!node || typeof node !== 'object') return;
    if (node.tag === 'Sprite' || node.tag === 'ProgressBar') {
      const spriteFrame = textureKey(node.props?.spriteFrame);
      const textureSize = textureSizes.get(spriteFrame) || textureSizes.get(spriteFrameAssets.get(spriteFrame));
      const nodeProps = node.props?.node;
      if (
        textureSize?.width
        && textureSize?.height
        && Number(textureKey(nodeProps?.width)) === textureSize.width
        && Number(textureKey(nodeProps?.height)) === textureSize.height
      ) {
        const { width, height, ...nodeWithoutSize } = nodeProps;
        node.props = { ...node.props, node: nodeWithoutSize };
      }
    }
    node.children?.forEach(normalize);
  }

  (Array.isArray(nodesData) ? nodesData : [nodesData]).forEach(normalize);
  return nodesData;
}
