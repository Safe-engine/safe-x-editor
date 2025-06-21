import { Box, Center, HStack } from "base/Stack";
import clsx from "clsx";
import { useState } from "react";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolderOpen } from "react-icons/ai";
import { CiImageOn } from 'react-icons/ci';

function renderIcon(data: ArmatureNode) {
  if (data.isDirectory) {
    return <AiFillFolderOpen color="white" />;
  }
  return <CiImageOn color="yellow" />;
}

export function TreeNode({ node, style, dragHandle }: NodeRendererProps<any>) {
  const [tempName, setTempName] = useState('');
  // console.log('style', style);
  // const { openMenu } = useContextMenuStore();

  const handleContextMenu = (
    e: React.MouseEvent,
    node: ArmatureNode
  ) => {
    e.preventDefault();
    // openMenu(node, { x: e.clientX, y: e.clientY });
  };

  return <HStack ref={dragHandle}
    className={clsx(
      'hover:cursor-pointer hover:bg-gray-500',
      node.isSelected && 'bg-gray-500'
    )}

    onDoubleClick={() => {
      // setTempName(node.data.name)
      // node.edit()
    }}
    onContextMenu={(e) => handleContextMenu(e, node.data)}
  >
    <Center>
      <Box style={style} className="m-auto">{renderIcon(node.data)}</Box>
      <Box className={clsx(node.isSelected ? 'text-yellow-400' : 'text-white')}>{node.data.name}</Box>
    </Center>
  </HStack >
}
