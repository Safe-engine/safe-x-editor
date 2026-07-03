import { Box, Center, HStack } from "base/Stack";
import clsx from "clsx";
import { useState } from "react";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolderOpen } from "react-icons/ai";
import { CiImageOn } from 'react-icons/ci';

const textureExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']);

function fileUrl(path: string) {
  const normalized = path.replace(/\\/g, '/');
  return `file://${normalized.split('/').map(encodeURIComponent).join('/')}`;
}

function isTexture(data: any) {
  const extension = data.extension || data.name?.match(/\.[^.]+$/)?.[0];
  return data.type === 'resource' && !data.isDirectory && textureExtensions.has(extension?.toLowerCase());
}

function renderIcon(data: any) {
  if (data.isDirectory) {
    return <AiFillFolderOpen color="#d6d6d6" />;
  }
  if (isTexture(data)) {
    return <img className="h-4 w-4 rounded-sm object-cover" src={fileUrl(data.path)} />;
  }
  return <CiImageOn color="#9fb7ff" />;
}

export function TreeNode({ node, style, dragHandle }: NodeRendererProps<any>) {
  const [tempName, setTempName] = useState('');
  // console.log('style', style);
  // const { openMenu } = useContextMenuStore();

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
      // setTempName(node.data.name)
      // node.edit()
    }}
    onContextMenu={(e) => handleContextMenu(e, node.data)}
  >
    <Center>
      <Box className="m-auto w-4 shrink-0">{renderIcon(node.data)}</Box>
      <Box className={clsx('truncate', node.isSelected ? 'text-[#ffffff]' : 'text-[#d6d6d6]')}>{node.data.name}</Box>
    </Center>
  </HStack >
}
