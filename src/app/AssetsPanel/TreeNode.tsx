import clsx from "clsx";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolder, AiFillFolderOpen } from "react-icons/ai";
import { GiSkeletonInside } from "react-icons/gi";
import { Box, Center, HStack } from "../../base/Stack";
import { useActions } from "../../states/app.context";

function renderIcon(node: any) {
  const { data, isOpen } = node
  if (data.isDirectory) {
    return isOpen ? <AiFillFolderOpen color="white" /> : <AiFillFolder color="white" />;
  }
  if (data.type === 'dragonBones') {
    return <GiSkeletonInside color="blue" />;
  }
  // console.log('data', data);
  return <img src={data.value} style={{ width: 24, height: 24 }} />;
}

function getNodeName(data) {
  const { key = '', name, isDirectory } = data
  return isDirectory ? name : key.replaceAll('sf_', '').replaceAll('db_', '').replaceAll('_json', '');
}

export function TreeNode({ node, style, dragHandle }: NodeRendererProps<any>) {
  const { setDragNode } = useActions()

  const handleContextMenu = (
    e: React.MouseEvent,
    node: any
  ) => {
    e.preventDefault();
    // openMenu(node, { x: e.clientX, y: e.clientY });
  };

  return <HStack ref={dragHandle}
    className={clsx(
      'hover:cursor-pointer hover:bg-gray-500',
      node.isSelected && 'bg-gray-500'
    )}

    onDragStart={(event) => {
      // console.log('onDragStart node', node.data.path)
      setDragNode(node.data.path)
    }}
    onContextMenu={(e) => handleContextMenu(e, node.data)}
  >
    <Center>
      <Box style={style} className="m-auto">{renderIcon(node)}</Box>
      <Box className={clsx(node.isSelected ? 'text-yellow-400' : 'text-white')}>{getNodeName(node.data)}</Box>
    </Center>
  </HStack >
}