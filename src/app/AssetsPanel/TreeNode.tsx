import clsx from "clsx";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolder, AiFillFolderOpen } from "react-icons/ai";
import { Box, Center, HStack } from "../../base/Stack";
import { useActions } from "../../states/app.context";

function renderIcon(node: any) {
  const { data, isOpen } = node
  if (data.isDirectory) {
    return isOpen ? <AiFillFolderOpen color="white" /> : <AiFillFolder color="white" />;
  }
  // console.log('data', data);
  return <img src={data.custom.path} style={{ width: 24, height: 24 }} />;
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
      <Box className={clsx(node.isSelected ? 'text-yellow-400' : 'text-white')}>{node.data.name}</Box>
    </Center>
  </HStack >
}