import { Box, Center, HStack } from "base/Stack";
import clsx from "clsx";
import { get } from "lodash-es";
import { useRef, useState } from "react";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolder, AiFillFolderOpen } from "react-icons/ai";
import { FiChevronRight, FiEye, FiPlus, FiRepeat } from "react-icons/fi";
import { RiBox3Line } from "react-icons/ri";

type TreeItemProps = NodeRendererProps<any> & {
  onAddNode: (name: string, parentId: string) => void;
  onFocusNode: (node: any) => void;
  onDropNode: (item: any, parentId: string) => void;
};

const addNodeMenu = [
  { label: 'Group', items: ['Container', 'UILayout', 'Panel', 'ScrollView'] },
  { label: 'Animation', items: ['DragonBones', 'SpineSkeleton', 'DicedSprite', 'Particle'] },
  { label: 'UI', items: ['ProgressBar', 'CircleProgress', 'Slider', 'Button', 'RichText', 'Label'] },
];

function renderIcon(data: any, isOpen = false) {
  if (data.isDirectory) {
    return isOpen ? <AiFillFolderOpen color="#d6d6d6" /> : <AiFillFolder color="#d6d6d6" />;
  }
  if (data.loop) {
    return <FiRepeat color="#9fb7ff" />;
  }
  return <RiBox3Line color="#9fb7ff" />;
}

function renderName(node: any) {
  const nodeName = get(node, 'data.props.node.name');
  if (nodeName)
    return <Box className={clsx('truncate text-[11px]', node.isSelected ? 'text-[#ffffff]' : 'text-[#b8b8b8]')}>
      {String(nodeName).replace(/^(?:"(.*)"|'(.*)')$/, '$1$2')}
    </Box>
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

function isExternalNodeDrop(event: React.DragEvent) {
  return event.dataTransfer.types.includes('application/x-safex-node');
}

export function TreeItem({ node, style, dragHandle, onAddNode, onFocusNode, onDropNode }: TreeItemProps) {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(addNodeMenu[0].label);
  const lastClickRef = useRef(0);

  const handleFocus = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onFocusNode(node);
  };

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
      'h-full w-full select-none items-center justify-between rounded-sm px-1 text-[12px] text-[#d6d6d6] hover:cursor-pointer hover:bg-[#303846]',
      node.isSelected && 'bg-[#304766] text-[#f0f0f0]',
      node.willReceiveDrop && 'bg-[#315a3a] ring-1 ring-inset ring-[#58d68d]',
      isDropTarget && 'bg-[#315a3a] ring-1 ring-inset ring-[#58d68d]'
    )}
    onClick={(e) => {
      const now = Date.now();
      if (e.detail === 2 || now - lastClickRef.current < 350) {
        handleFocus(e);
      }
      lastClickRef.current = now;
    }}
    onDoubleClick={(e) => handleFocus(e)}
    onContextMenu={(e) => handleContextMenu(e, node.data)}
    onDragEnter={(event) => {
      if (isExternalNodeDrop(event)) setIsDropTarget(true);
    }}
    onDragLeave={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node)) setIsDropTarget(false);
    }}
    onDragOver={(event) => {
      if (!isExternalNodeDrop(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDropTarget(true);
      event.dataTransfer.dropEffect = 'copy';
    }}
    onDrop={(event) => {
      if (!isExternalNodeDrop(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDropTarget(false);
      try {
        onDropNode(JSON.parse(event.dataTransfer.getData('application/x-safex-node')), node.data.id);
      } catch {
        // Ignore drops that do not contain an asset or component payload.
      }
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
        onDoubleClick={(e) => {
          e.stopPropagation();
        }}
      >
        {renderIcon(node.data, node.isOpen)}
      </Box>
      <Box className={clsx('truncate font-semibold', node.isSelected ? 'text-[#ffffff]' : 'text-[#d6d6d6]')}>{node.data.tag}</Box>
      {renderName(node)}
    </Center>
    <div className="relative ml-1 flex shrink-0 items-center">
      <button
        type="button"
        className="flex rounded p-0.5 text-[#aeb8c5] hover:bg-[#49637f] hover:text-white"
        title="Add node"
        aria-label="Add node"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          setActiveMenu(addNodeMenu[0].label)
          setIsAddMenuOpen((open) => !open)
        }}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <FiPlus size={14} />
      </button>
      {isAddMenuOpen && (
        <div
          className="absolute right-0 top-6 z-50 flex min-w-44 rounded-sm border border-[#111] bg-[#252525] py-1 text-[12px] text-[#dcdcdc] shadow-lg"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <div className="w-24 border-r border-[#3a3a3a]">
            {addNodeMenu.map((menu) => (
              <button
                key={menu.label}
                type="button"
                className={clsx('flex w-full items-center justify-between px-2 py-1.5 text-left hover:bg-[#304766] hover:text-white', activeMenu === menu.label && 'bg-[#304766] text-white')}
                onMouseEnter={() => setActiveMenu(menu.label)}
              >
                {menu.label}<FiChevronRight size={12} />
              </button>
            ))}
          </div>
          <div className="min-w-28">
            {addNodeMenu.find((menu) => menu.label === activeMenu)?.items.map((name) => (
              <button
                key={name}
                type="button"
                className="block w-full px-2 py-1.5 text-left hover:bg-[#304766] hover:text-white"
                onClick={() => {
                  onAddNode(name, node.data.id)
                  setIsAddMenuOpen(false)
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        className="flex rounded p-0.5 text-[#aeb8c5] hover:bg-[#49637f] hover:text-white"
        title="Focus in preview"
        aria-label="Focus in preview"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          onFocusNode(node)
        }}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <FiEye size={14} />
      </button>
    </div>
  </HStack >
}
