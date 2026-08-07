import { Box, Center, HStack } from "base/Stack";
import clsx from "clsx";
import { getLastRootFolder } from "data/AppData";
import { toFileUrl } from 'helper/fileUrl';
import pathUtils from 'path-browserify';
import { useEffect, useRef, useState } from "react";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolderOpen } from "react-icons/ai";
import { CiImageOn } from 'react-icons/ci';
import { FaMusic } from "react-icons/fa";
import { FaFont } from "react-icons/fa6";
import { GiSkeletonInside } from 'react-icons/gi';
import { IoMdCube } from "react-icons/io";
import { FiPlus } from 'react-icons/fi';
import { SiSpine } from 'react-icons/si';

const textureExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']);

function getDroppedFilePath(file: File) {
  const electronRequire = (globalThis as any).require;
  return electronRequire?.('electron')?.webUtils?.getPathForFile(file) || (file as any).path || '';
}

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

function dicedSpriteTexturePath(data: any) {
  const name = data.json?.meta?.name;
  if (!name) return '';
  return pathUtils.join(pathUtils.dirname(data.path), `${name}.png`).replace(/\\/g, '/');
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
  if (data.type === 'dicedSprite') return imageUrl(dicedSpriteTexturePath(data));
  const extension = data.extension || data.name?.match(/\.[^.]+$/)?.[0];
  if (textureExtensions.has(extension?.toLowerCase())) return imageUrl(data.value || data.path);
  return '';
}

function getDicedSpriteIcon(data: any, textureIconSrc: string) {
  const meta = data.json?.meta;
  const frame = data.json?.animations?.[0]?.frames?.[0];
  if (!Array.isArray(frame) || !meta?.rawWidth || !meta?.rawHeight || !meta?.cellW || !meta?.cellH || !meta?.atlasCols) return null;

  const scale = Math.min(16 / meta.rawWidth, 16 / meta.rawHeight);
  const width = meta.rawWidth * scale;
  const height = meta.rawHeight * scale;
  const cellWidth = meta.cellW * scale;
  const cellHeight = meta.cellH * scale;

  return (
    <span className="flex h-4 w-4 items-center justify-center overflow-hidden rounded-sm bg-[#181818]">
      <span className="relative block overflow-hidden" style={{ width, height }}>
        {frame.flatMap((row: number[], rowIndex: number) => row.map((cell, columnIndex) => {
          if (cell < 0) return null;
          const atlasColumn = cell % meta.atlasCols;
          const atlasRow = Math.floor(cell / meta.atlasCols);
          return <span
            key={`${rowIndex}-${columnIndex}`}
            className="absolute block bg-no-repeat"
            style={{
              left: columnIndex * cellWidth,
              top: rowIndex * cellHeight,
              width: cellWidth,
              height: cellHeight,
              backgroundImage: `url(${textureIconSrc})`,
              backgroundPosition: `${-atlasColumn * cellWidth}px ${-atlasRow * cellHeight}px`,
              backgroundSize: `${meta.atlasCols * cellWidth}px auto`,
            }}
          />;
        }))}
      </span>
    </span>
  );
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
    if (data.type === 'dicedSprite') {
      const dicedSpriteIcon = getDicedSpriteIcon(data, textureIconSrc);
      if (dicedSpriteIcon) return dicedSpriteIcon;
    }
    if (data.type === 'frame') {
      const frameIcon = getFrameIcon(data, textureIconSrc);
      if (frameIcon) return frameIcon;
    }
    return <img className="h-4 w-4 rounded-sm object-cover" src={textureIconSrc} alt="" />;
  }
  return <CiImageOn color="#9fb7ff" />;
}

type AssetTreeNodeProps = NodeRendererProps<any> & {
  dragItem?: any;
  getDragItems?: (node: any) => any[];
  onCreate?: (data: any) => void;
  canRename?: boolean;
  onImport?: (data: any, sourcePaths: string[]) => void;
};

export function TreeNode({ node, style, dragItem, getDragItems, onCreate, canRename, onImport }: AssetTreeNodeProps) {
  const renameInput = useRef<HTMLInputElement>(null);
  const [isFileDropTarget, setIsFileDropTarget] = useState(false);
  const isRenamable = canRename && !node.data.isDirectory && node.data.type !== 'frame';
  useEffect(() => {
    if (node.isEditing) {
      renameInput.current?.focus();
      renameInput.current?.select();
    }
  }, [node.isEditing]);
  const getDroppedPaths = (event: React.DragEvent) => Array.from(event.dataTransfer.files)
    .map(getDroppedFilePath)
    .filter(Boolean);
  // console.log('style', style);
  // const { openMenu } = useContextMenuStore();

  const handleContextMenu = (
    e: React.MouseEvent,
    node: any
  ) => {
    e.preventDefault();
    // openMenu(node, { x: e.clientX, y: e.clientY });
  };

  return <HStack
    style={style}
    draggable={Boolean(dragItem)}
    className={clsx(
      'h-full w-full items-center justify-between rounded-sm px-1 text-[12px] text-[#d6d6d6] hover:cursor-pointer hover:bg-[#303846]',
      node.isSelected && 'bg-[#304766] text-[#f0f0f0]',
      isFileDropTarget && 'bg-[#49637f] text-white ring-1 ring-inset ring-[#74a8dc]'
    )}

    onDoubleClick={() => {
      if (isRenamable) node.edit()
    }}
    onContextMenu={(e) => handleContextMenu(e, node.data)}
    onDragStart={(event) => {
      if (!dragItem) return;
      const dragItems = getDragItems?.(node) || [dragItem];
      const payload = dragItems.length === 1 ? dragItems[0] : { items: dragItems };
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-safex-node', JSON.stringify(payload));
      event.dataTransfer.setData('text/plain', dragItems.length === 1 ? dragItem.name || 'Node' : `${dragItems.length} nodes`);
    }}
    onDragOver={(event) => {
      if (!node.data.isDirectory || !event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
    }}
    onDragEnter={(event) => {
      if (!node.data.isDirectory || !event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      setIsFileDropTarget(true);
    }}
    onDragLeave={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsFileDropTarget(false);
    }}
    onDrop={(event) => {
      const sourcePaths = getDroppedPaths(event);
      if (!node.data.isDirectory || !sourcePaths.length) return;
      event.preventDefault();
      event.stopPropagation();
      setIsFileDropTarget(false);
      onImport?.(node.data, sourcePaths);
    }}
  >
    <Center>
      <Box className="m-auto w-4 shrink-0">{renderIcon(node.data)}</Box>
      {node.isEditing ? <input
        ref={renameInput}
        className="h-5 min-w-0 rounded-sm border border-[#4a90e2] bg-[#151515] px-1 text-[12px] text-[#e2e2e2] outline-none"
        defaultValue={node.data.name}
        onBlur={() => node.reset()}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') node.reset()
          if (event.key === 'Enter') node.submit(renameInput.current?.value || '')
        }}
      /> : <Box className={clsx('truncate', node.isSelected ? 'text-[#ffffff]' : 'text-[#d6d6d6]')}>{node.data.name}</Box>}
    </Center>
    {node.data.createKind && <button
      type="button"
      className="ml-1 flex shrink-0 rounded p-0.5 text-[#aeb8c5] hover:bg-[#49637f] hover:text-white"
      title={`New ${node.data.createKind === 'scene' ? 'Scene' : 'Component'}`}
      aria-label={`New ${node.data.createKind === 'scene' ? 'Scene' : 'Component'}`}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onCreate?.(node.data)
      }}
    >
      <FiPlus size={14} />
    </button>}
  </HStack >
}
