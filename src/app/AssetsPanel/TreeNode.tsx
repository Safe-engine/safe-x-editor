import { Box, Center, HStack } from "base/Stack";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { NodeRendererProps } from "react-arborist";
import { FiPlus } from 'react-icons/fi';
import pathUtils from 'path-browserify';
import { getDroppedPaths, renderResourceIcon } from "./resourceUtils";

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
  const canReceiveFileDrop = Boolean(onImport);

  useEffect(() => {
    if (node.isEditing) {
      renameInput.current?.focus();
      renameInput.current?.select();
    }
  }, [node.isEditing]);
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
      if (!canReceiveFileDrop || !event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
    }}
    onDragEnter={(event) => {
      if (!canReceiveFileDrop || !event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      setIsFileDropTarget(true);
    }}
    onDragLeave={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsFileDropTarget(false);
    }}
    onDrop={(event) => {
      if (!canReceiveFileDrop) return;
      const sourcePaths = getDroppedPaths(event);
      if (!sourcePaths.length) return;
      event.preventDefault();
      event.stopPropagation();
      setIsFileDropTarget(false);
      const targetData = node.data.isDirectory ? node.data : { path: pathUtils.dirname(node.data.path || '') };
      onImport?.(targetData, sourcePaths);
    }}
  >
    <Center>
      <Box
        className="m-auto w-4 shrink-0"
        onClick={(e) => {
          if (node.isInternal || node.data.isDirectory) {
            e.stopPropagation();
            node.toggle();
          }
        }}
      >
        {renderResourceIcon(node.data, undefined, 16, false, node.isOpen)}
      </Box>
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
