import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AiFillFolderOpen } from 'react-icons/ai';
import { FiChevronLeft, FiChevronRight, FiCornerLeftUp, FiFolder } from 'react-icons/fi';
import { getDroppedFilePath, renderResourceIcon } from './resourceUtils';

type ResourceGridViewProps = {
  data: any[];
  rootFolder: string;
  resourceFilter?: string;
  onClearFilter?: () => void;
  onRename?: (params: { node: { data: any }; name: string }) => void;
  onImport?: (directory: any, sourcePaths: string[]) => void;
  getDragItem: (data: any) => any;
  height?: number | string;
};

function flattenTree(items: any[]): any[] {
  const result: any[] = [];
  for (const item of items) {
    if (!item.isDirectory) {
      result.push(item);
    }
    if (Array.isArray(item.children) && item.children.length > 0) {
      result.push(...flattenTree(item.children));
    }
  }
  return result;
}

function findDirectoryNode(items: any[], pathSegments: string[]): any | null {
  let currentItems = items;
  let foundNode: any = null;

  for (const segment of pathSegments) {
    const nextNode = currentItems.find((item) => item.isDirectory && item.name === segment);
    if (!nextNode) return null;
    foundNode = nextNode;
    currentItems = nextNode.children || [];
  }

  return foundNode;
}

export default function ResourceGridView({
  data,
  rootFolder,
  resourceFilter = '',
  onClearFilter,
  onRename,
  onImport,
  getDragItem,
  height,
}: ResourceGridViewProps) {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [isBackgroundDropTarget, setIsBackgroundDropTarget] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // If search filter is applied, display all matching assets
  const isSearching = Boolean(resourceFilter.trim());

  const currentDirectoryNode = useMemo(() => {
    if (currentPath.length === 0) return null;
    return findDirectoryNode(data, currentPath);
  }, [data, currentPath]);

  // Adjust path if current directory disappears
  useEffect(() => {
    if (currentPath.length > 0 && !currentDirectoryNode) {
      setCurrentPath([]);
    }
  }, [currentPath, currentDirectoryNode]);

  const displayedItems = useMemo(() => {
    if (isSearching) {
      return flattenTree(data);
    }
    if (currentPath.length === 0) {
      return data;
    }
    return currentDirectoryNode?.children || [];
  }, [isSearching, data, currentPath, currentDirectoryNode]);

  useEffect(() => {
    if (editingKey) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [editingKey]);

  const getDroppedPaths = (event: React.DragEvent) =>
    Array.from(event.dataTransfer.files)
      .map(getDroppedFilePath)
      .filter(Boolean);

  function handleNavigateUp() {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  }

  function handleItemClick(item: any) {
    setSelectedKey(item.key || item.path || item.name);
  }

  function handleItemDoubleClick(item: any) {
    if (item.isDirectory) {
      setCurrentPath([...currentPath, item.name]);
      setSelectedKey(null);
    } else if (item.type !== 'frame') {
      setEditingKey(item.key || item.path || item.name);
      setEditingName(item.name);
    }
  }

  function handleRenameSubmit(item: any) {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== item.name) {
      onRename?.({ node: { data: item }, name: trimmed });
    }
    setEditingKey(null);
  }

  return (
    <div
      className="flex flex-col bg-[#252525] text-[#dcdcdc]"
      style={{ height: height ?? '100%' }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        setIsBackgroundDropTarget(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsBackgroundDropTarget(false);
        }
      }}
      onDrop={(event) => {
        const sourcePaths = getDroppedPaths(event);
        if (!sourcePaths.length) return;
        event.preventDefault();
        event.stopPropagation();
        setIsBackgroundDropTarget(false);
        const targetDir = currentDirectoryNode || { path: currentPath.join('/') };
        onImport?.(targetDir, sourcePaths);
      }}
    >
      {/* Breadcrumb Navigation Bar */}
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-[#181818] bg-[#1e1e1e] px-2 text-[11px]">
        {isSearching ? (
          <div className="flex items-center gap-1.5 truncate text-[#a0a0a0]">
            <span>Search results:</span>
            <span className="font-medium text-[#f0f0f0]">{displayedItems.length} items</span>
            {onClearFilter && (
              <button
                type="button"
                className="ml-2 text-[10px] text-[#4a90e2] hover:underline"
                onClick={onClearFilter}
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 overflow-x-auto text-[#a0a0a0]">
            {currentPath.length > 0 && (
              <button
                type="button"
                className="mr-1 flex h-5 w-5 items-center justify-center rounded hover:bg-[#303846] text-[#d6d6d6]"
                title="Up one level"
                aria-label="Up one level"
                onClick={handleNavigateUp}
              >
                <FiCornerLeftUp size={12} />
              </button>
            )}
            <button
              type="button"
              className={clsx(
                'flex items-center gap-1 rounded px-1 py-0.5 hover:bg-[#303846]',
                currentPath.length === 0 ? 'font-medium text-[#f0f0f0]' : 'text-[#a0a0a0]'
              )}
              onClick={() => setCurrentPath([])}
            >
              <FiFolder size={12} />
              <span>res</span>
            </button>
            {currentPath.map((segment, index) => {
              const isLast = index === currentPath.length - 1;
              return (
                <React.Fragment key={`${segment}-${index}`}>
                  <FiChevronRight size={10} className="shrink-0 text-[#666]" />
                  <button
                    type="button"
                    className={clsx(
                      'rounded px-1 py-0.5 truncate max-w-[100px] hover:bg-[#303846]',
                      isLast ? 'font-medium text-[#f0f0f0]' : 'text-[#a0a0a0]'
                    )}
                    onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                    title={segment}
                  >
                    {segment}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid Content Area */}
      <div
        className={clsx(
          'flex-1 overflow-y-auto p-2 transition-colors',
          isBackgroundDropTarget && 'bg-[#2b3a4a] ring-2 ring-inset ring-[#4a90e2]'
        )}
      >
        {displayedItems.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-[12px] text-[#777]">
            {isSearching ? 'No matching resources found' : 'This folder is empty'}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
            {displayedItems.map((item) => {
              const itemKey = item.key || item.path || item.name;
              const isSelected = selectedKey === itemKey;
              const isEditing = editingKey === itemKey;
              const isDropTarget = dropTargetKey === itemKey;
              const dragItem = getDragItem(item);

              return (
                <div
                  key={itemKey}
                  draggable={Boolean(dragItem)}
                  className={clsx(
                    'group relative flex flex-col rounded overflow-hidden transition-all cursor-pointer select-none',
                    'border border-[#222] bg-[#1a1a1a] hover:bg-[#252525] hover:border-[#4a90e2]/80',
                    isSelected && 'bg-[#26374d] border-[#4a90e2] ring-1 ring-[#4a90e2] text-white',
                    isDropTarget && 'bg-[#3b5270] border-[#74a8dc] ring-2 ring-[#74a8dc]'
                  )}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  onDragStart={(event) => {
                    if (!dragItem) return;
                    event.dataTransfer.effectAllowed = 'copy';
                    event.dataTransfer.setData('application/x-safex-node', JSON.stringify(dragItem));
                    event.dataTransfer.setData('text/plain', item.name || 'Node');
                  }}
                  onDragOver={(event) => {
                    if (!item.isDirectory || !event.dataTransfer.types.includes('Files')) return;
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = 'copy';
                  }}
                  onDragEnter={(event) => {
                    if (!item.isDirectory || !event.dataTransfer.types.includes('Files')) return;
                    event.preventDefault();
                    setDropTargetKey(itemKey);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setDropTargetKey(null);
                    }
                  }}
                  onDrop={(event) => {
                    const sourcePaths = getDroppedPaths(event);
                    if (!item.isDirectory || !sourcePaths.length) return;
                    event.preventDefault();
                    event.stopPropagation();
                    setDropTargetKey(null);
                    onImport?.(item, sourcePaths);
                  }}
                >
                  {/* Thumbnail / Icon Container - Full width aspect-square with no padding */}
                  <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-[#121212] p-0">
                    {renderResourceIcon(item, rootFolder, 80, true)}
                  </div>

                  {/* Label / Rename Input */}
                  <div className="flex w-full items-center justify-center border-t border-[#222] bg-[#181818] px-1 py-1 group-hover:bg-[#202020]">
                    {isEditing ? (
                      <input
                        ref={renameInputRef}
                        className="h-5 w-full rounded border border-[#4a90e2] bg-[#111] px-1 text-center text-[11px] text-[#f0f0f0] outline-none"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleRenameSubmit(item)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingKey(null);
                          } else if (e.key === 'Enter') {
                            handleRenameSubmit(item);
                          }
                        }}
                      />
                    ) : (
                      <span
                        className={clsx(
                          'w-full truncate text-center text-[11px] leading-tight',
                          isSelected ? 'font-medium text-white' : 'text-[#c8c8c8] group-hover:text-white'
                        )}
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
