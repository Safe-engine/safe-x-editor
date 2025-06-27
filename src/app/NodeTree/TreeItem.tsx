import clsx from "clsx";
import { get } from "lodash";
import { useState } from "react";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolderOpen } from "react-icons/ai";
import { RiBox3Line } from "react-icons/ri";
import { Box, Center, HStack } from "../../base/Stack";
import { useSelector } from "../../states/app.context";
import { selectSelectedEditingClassNamePath } from "../../states/app.selectors";

function renderIcon(data: any) {
  if (data.isDirectory) {
    return <AiFillFolderOpen color="white" />;
  }
  return <RiBox3Line color="#001177" />;
}

function renderName(node: any) {
  if (node.data.name)
    return <Box className={clsx(node.isSelected ? 'text-yellow-500' : 'text-yellow-600')}>{node.data.name}</Box>
  const spriteFrame = get(node, 'data.props.spriteFrame')
  if (spriteFrame)
    return <Box className={clsx(node.isSelected ? 'text-yellow-500' : 'text-blue-400')}>
      {spriteFrame.replace('{sf_', '').replace('}', '')}
    </Box>
  const string = get(node, 'data.props.string')
  if (string)
    return <Box className={clsx(node.isSelected ? 'text-yellow-500' : 'text-green-400')}>
      {string}
    </Box>
}

export function TreeItem({ node, style, dragHandle }: NodeRendererProps<any>) {
  const [tempName, setTempName] = useState('');
  const selectedEditingClassNamePath = useSelector(selectSelectedEditingClassNamePath);

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
    onDoubleClick={() => {
      setTempName(node.data.name)
      node.edit()
    }}
    onContextMenu={(e) => handleContextMenu(e, node.data)}
  >
    <Center>
      <Box style={style} className="m-auto">{renderIcon(node.data)}</Box>
      <Box className={clsx(node.isSelected ? 'text-yellow-400' : 'text-white')}>{node.data.tag}</Box>
      {renderName(node)}
    </Center>
  </HStack >
}
