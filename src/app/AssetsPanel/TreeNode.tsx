import { Box, Center, HStack } from "base/Stack";
import clsx from "clsx";
import { getLastRootFolder } from "data/AppData";
import { useState } from "react";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolderOpen } from "react-icons/ai";
import { CiImageOn } from 'react-icons/ci';

const textureExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']);

function fileUrl(path: string) {
  const normalized = path.replace(/\\/g, '/');
  return `file://${normalized.split('/').map(encodeURIComponent).join('/')}`;
}

function imageUrl(path?: string) {
  if (!path) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  if (path.startsWith('/')) return fileUrl(path);
  const rootFolder = getLastRootFolder();
  const normalized = path.replace(/\\/g, '/').replace(/^res\//, '');
  return fileUrl(rootFolder ? `${rootFolder}/res/${normalized}` : normalized);
}

function getTextureIconSrc(data: any) {
  if (data.isDirectory) return '';
  if (data.type === 'spriteFrame') return imageUrl(data.value);
  if (data.type === 'frame') return imageUrl(data.texture);
  const extension = data.extension || data.name?.match(/\.[^.]+$/)?.[0];
  if (textureExtensions.has(extension?.toLowerCase())) return imageUrl(data.value || data.path);
  return '';
}

function renderIcon(data: any) {
  if (data.isDirectory) {
    return <AiFillFolderOpen color="#d6d6d6" />;
  }
  const textureIconSrc = getTextureIconSrc(data);
  if (textureIconSrc) {
    return <img className="h-4 w-4 rounded-sm object-cover" src={textureIconSrc} alt="" />;
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
