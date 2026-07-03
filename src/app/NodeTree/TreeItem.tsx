import { Box, Center, HStack } from "base/Stack";
import clsx from "clsx";
import { get } from "lodash-es";
import { useState } from "react";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolderOpen } from "react-icons/ai";
import { RiBox3Line } from "react-icons/ri";
import { useSelector } from "states/app.context";
import { selectSelectedEditingClassNamePath } from "states/app.selectors";

function renderIcon(data: any) {
  if (data.isDirectory) {
    return <AiFillFolderOpen color="#d6d6d6" />;
  }
  return <RiBox3Line color="#9fb7ff" />;
}

function renderName(node: any) {
  if (node.data.name)
    return <Box className={clsx('truncate text-[11px]', node.isSelected ? 'text-[#ffffff]' : 'text-[#b8b8b8]')}>{node.data.name}</Box>
  const spriteFrame = get(node, 'data.props.spriteFrame')
  if (spriteFrame)
    return <Box className={clsx('truncate text-[11px]', node.isSelected ? 'text-[#ffffff]' : 'text-[#9fb7ff]')}>
      {spriteFrame.replace('{sf_', '').replace('}', '')}
    </Box>
  const string = get(node, 'data.props.string')
  if (string)
    return <Box className={clsx('truncate text-[11px]', node.isSelected ? 'text-[#ffffff]' : 'text-[#86d386]')}>
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
    style={style}
    className={clsx(
      'h-full items-center rounded-sm px-1 text-[12px] text-[#d6d6d6] hover:cursor-pointer hover:bg-[#303846]',
      node.isSelected && 'bg-[#304766] text-[#f0f0f0]'
    )}
    onDoubleClick={() => {
      setTempName(node.data.name)
      node.edit()
    }}
    onContextMenu={(e) => handleContextMenu(e, node.data)}
  >
    <Center>
      <Box className="m-auto w-4 shrink-0">{renderIcon(node.data)}</Box>
      <Box className={clsx('truncate font-semibold', node.isSelected ? 'text-[#ffffff]' : 'text-[#d6d6d6]')}>{node.data.tag}</Box>
      {renderName(node)}
    </Center>
  </HStack >
}
