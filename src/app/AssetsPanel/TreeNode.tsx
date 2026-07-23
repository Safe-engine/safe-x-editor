import { Box, Center, HStack } from "base/Stack";
import clsx from "clsx";
import { getLastRootFolder } from "data/AppData";
import { toFileUrl } from 'helper/fileUrl';
import pathUtils from 'path-browserify';
import { useState } from "react";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolderOpen } from "react-icons/ai";
import { CiImageOn } from 'react-icons/ci';
import { FaMusic } from "react-icons/fa";
import { FaFont } from "react-icons/fa6";
import { GiSkeletonInside } from 'react-icons/gi';
import { IoMdCube } from "react-icons/io";
import { SiSpine } from 'react-icons/si';

const textureExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']);

function imageUrl(path?: string) {
  if (!path) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  if (path.startsWith('/')) return toFileUrl(path);
  const rootFolder = getLastRootFolder();
  const normalized = path.replace(/\\/g, '/').replace(/^res\//, '');
  return toFileUrl(rootFolder ? `${rootFolder}/res/${normalized}` : normalized);
}

function spriteSheetTexturePath(data: any) {
  if (data.texture) return data.texture;
  const image = data.json?.meta?.image;
  if (image) return pathUtils.join(pathUtils.dirname(data.path), image).replace(/\\/g, '/');
  return data.path?.replace(/\.(json|plist)$/i, '.png');
}

function parseNumbers(value = '') {
  return String(value).match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
}

function parseRect(value: any = '') {
  if (value && typeof value === 'object') {
    return {
      x: value.x || 0,
      y: value.y || 0,
      w: value.w ?? value.width ?? 0,
      h: value.h ?? value.height ?? 0,
    };
  }
  const [x = 0, y = 0, w = 0, h = 0] = parseNumbers(value);
  return { x, y, w, h };
}

function parseSize(value: any = '') {
  if (value && typeof value === 'object') {
    return {
      w: value.w ?? value.width ?? 0,
      h: value.h ?? value.height ?? 0,
    };
  }
  const [w = 0, h = 0] = parseNumbers(value);
  return { w, h };
}

function isRotatedFrame(value: any) {
  return value === true || value === 'true';
}

function getTextureIconSrc(data: any) {
  if (data.isDirectory) return '';
  if (data.type === 'spriteFrame') return imageUrl(data.value);
  if (data.type === 'frame') return imageUrl(spriteSheetTexturePath(data));
  const extension = data.extension || data.name?.match(/\.[^.]+$/)?.[0];
  if (textureExtensions.has(extension?.toLowerCase())) return imageUrl(data.value || data.path);
  return '';
}

function getFrameIcon(data: any, textureIconSrc: string) {
  const frameEntry = data.json?.frames?.[data.name];
  const frame = frameEntry?.frame || frameEntry;
  if (!frame) return null;

  const rect = parseRect(frame);
  const size = parseSize(data.json?.meta?.size || data.json?.metadata?.size);
  if (!rect.w || !rect.h || !size.w || !size.h) return null;

  const rotated = isRotatedFrame(frameEntry?.rotated) || isRotatedFrame(frame?.rotated);
  const width = rotated ? rect.h : rect.w;
  const height = rotated ? rect.w : rect.h;
  const scale = Math.min(16 / width, 16 / height);
  return (
    <span className="flex h-4 w-4 items-center justify-center overflow-hidden rounded-sm bg-[#181818]">
      <span
        className="block overflow-hidden"
        style={{
          width: width * scale,
          height: height * scale,
        }}
      >
        <span
          className="block bg-no-repeat"
          style={{
            width: rect.w * scale,
            height: rect.h * scale,
            backgroundImage: `url(${textureIconSrc})`,
            backgroundPosition: `${-rect.x * scale}px ${-rect.y * scale}px`,
            backgroundSize: `${size.w * scale}px ${size.h * scale}px`,
            transform: rotated ? `translateY(${rect.w * scale}px) rotate(-90deg)` : undefined,
            transformOrigin: 'top left',
          }}
        />
      </span>
    </span>
  );
}

function renderIcon(data: any) {
  if (data.isDirectory) {
    return <AiFillFolderOpen color="#d6d6d6" />;
  }
  if (data.type === 'component') {
    return <IoMdCube color="cyan" />
  }
  if (data.type === 'dragonBones') {
    return <GiSkeletonInside color="blue" />
  }
  if (data.type === 'spine') {
    return <SiSpine color="orange" />
  }
  if (data.type === 'font') {
    return <FaFont color="white" />
  }
  if (data.type === 'audio') {
    return <FaMusic color="yellow" />
  }
  const textureIconSrc = getTextureIconSrc(data);
  if (textureIconSrc) {
    if (data.type === 'frame') {
      const frameIcon = getFrameIcon(data, textureIconSrc);
      if (frameIcon) return frameIcon;
    }
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
