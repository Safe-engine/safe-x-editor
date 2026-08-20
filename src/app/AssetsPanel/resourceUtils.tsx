import { toFileUrl } from 'helper/fileUrl';
import { getLastRootFolder } from 'data/AppData';
import pathUtils from 'path-browserify';
import React from 'react';
import { AiFillFolderOpen } from 'react-icons/ai';
import { CiImageOn } from 'react-icons/ci';
import { FaMusic } from 'react-icons/fa';
import { FaFont } from 'react-icons/fa6';
import { GiSkeletonInside } from 'react-icons/gi';
import { IoMdCube } from 'react-icons/io';
import { SiSpine } from 'react-icons/si';

export const textureExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']);

export function getDroppedFilePath(file: File) {
  const electronRequire = (globalThis as any).require;
  return electronRequire?.('electron')?.webUtils?.getPathForFile(file) || (file as any).path || '';
}

export function imageUrl(path?: string, rootFolder = getLastRootFolder()) {
  if (!path) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  if (path.startsWith('/')) return toFileUrl(path);
  const normalized = path.replace(/\\/g, '/').replace(/^res\//, '');
  return toFileUrl(rootFolder ? `${rootFolder}/res/${normalized}` : normalized);
}

export function spriteSheetTexturePath(data: any) {
  if (data.texture) return data.texture;
  const image = data.json?.meta?.image;
  if (image) return pathUtils.join(pathUtils.dirname(data.path), image).replace(/\\/g, '/');
  return data.path?.replace(/\.(json|plist)$/i, '.png');
}

export function dicedSpriteTexturePath(data: any) {
  const name = data.json?.meta?.name;
  if (!name) return '';
  return pathUtils.join(pathUtils.dirname(data.path), `${name}.png`).replace(/\\/g, '/');
}

export function parseNumbers(value: any = '') {
  return String(value).match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
}

export function parseRect(value: any = '') {
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

export function parseSize(value: any = '') {
  if (value && typeof value === 'object') {
    return {
      w: value.w ?? value.width ?? 0,
      h: value.h ?? value.height ?? 0,
    };
  }
  const [w = 0, h = 0] = parseNumbers(value);
  return { w, h };
}

export function isRotatedFrame(value: any) {
  return value === true || value === 'true';
}

export function getTextureIconSrc(data: any, rootFolder = getLastRootFolder()) {
  if (data.isDirectory) return '';
  if (data.type === 'spriteFrame') return imageUrl(data.value || data.path, rootFolder);
  if (data.type === 'frame') return imageUrl(spriteSheetTexturePath(data), rootFolder);
  if (data.type === 'dicedSprite') return imageUrl(dicedSpriteTexturePath(data), rootFolder);
  const extension = data.extension || data.name?.match(/\.[^.]+$/)?.[0];
  if (textureExtensions.has(extension?.toLowerCase())) return imageUrl(data.value || data.path, rootFolder);
  return '';
}

export function getDicedSpriteIcon(data: any, textureIconSrc: string, iconSize = 16) {
  const meta = data.json?.meta;
  const frame = data.json?.animations?.[0]?.frames?.[0];
  if (!Array.isArray(frame) || !meta?.rawWidth || !meta?.rawHeight || !meta?.cellW || !meta?.cellH || !meta?.atlasCols) return null;

  const scale = Math.min(iconSize / meta.rawWidth, iconSize / meta.rawHeight);
  const width = meta.rawWidth * scale;
  const height = meta.rawHeight * scale;
  const cellWidth = meta.cellW * scale;
  const cellHeight = meta.cellH * scale;

  return (
    <span
      className="flex items-center justify-center overflow-hidden bg-transparent"
      style={{ width: iconSize, height: iconSize }}
    >
      <span className="relative block overflow-hidden" style={{ width, height }}>
        {frame.flatMap((row: number[], rowIndex: number) => row.map((cell: number, columnIndex: number) => {
          if (cell < 0) return null;
          const atlasColumn = cell % meta.atlasCols;
          const atlasRow = Math.floor(cell / meta.atlasCols);
          return (
            <span
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
            />
          );
        }))}
      </span>
    </span>
  );
}

export function getFrameIcon(data: any, textureIconSrc: string, iconSize = 16) {
  const frameEntry = data.json?.frames?.[data.name];
  const frame = frameEntry?.frame || frameEntry;
  if (!frame) return null;

  const rect = parseRect(frame);
  const size = parseSize(data.json?.meta?.size || data.json?.metadata?.size);
  if (!rect.w || !rect.h || !size.w || !size.h) return null;

  const rotated = isRotatedFrame(frameEntry?.rotated) || isRotatedFrame(frame?.rotated);
  const width = rotated ? rect.h : rect.w;
  const height = rotated ? rect.w : rect.h;
  const scale = Math.min(iconSize / width, iconSize / height);
  return (
    <span
      className="flex items-center justify-center overflow-hidden bg-transparent"
      style={{ width: iconSize, height: iconSize }}
    >
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

export function renderResourceIcon(data: any, rootFolder?: string, size = 16, fillContainer = false) {
  const isLarge = size >= 32;
  const vectorIconSize = isLarge ? Math.min(size, 46) : size;

  if (data.isDirectory) {
    return <AiFillFolderOpen size={vectorIconSize} color="#d6d6d6" />;
  }
  if (data.type === 'component') {
    return <IoMdCube size={vectorIconSize} color="cyan" />;
  }
  if (data.type === 'dragonBones') {
    return <GiSkeletonInside size={vectorIconSize} color="#3b82f6" />;
  }
  if (data.type === 'spine') {
    return <SiSpine size={vectorIconSize} color="#f97316" />;
  }
  if (data.type === 'font') {
    return <FaFont size={vectorIconSize} color="white" />;
  }
  if (data.type === 'audio') {
    return <FaMusic size={vectorIconSize} color="#eab308" />;
  }
  const textureIconSrc = getTextureIconSrc(data, rootFolder);
  if (textureIconSrc) {
    if (data.type === 'dicedSprite') {
      const dicedSpriteIcon = getDicedSpriteIcon(data, textureIconSrc, size);
      if (dicedSpriteIcon) return dicedSpriteIcon;
    }
    if (data.type === 'frame') {
      const frameIcon = getFrameIcon(data, textureIconSrc, size);
      if (frameIcon) return frameIcon;
    }
    return (
      <img
        style={fillContainer ? undefined : { width: size, height: size }}
        className={fillContainer ? "h-full w-full object-contain pointer-events-none select-none" : "rounded-sm object-contain"}
        src={textureIconSrc}
        alt=""
      />
    );
  }
  return <CiImageOn size={vectorIconSize} color="#9fb7ff" />;
}
