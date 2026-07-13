import { Box, Center, HStack } from "base/Stack";
import clsx from "clsx";
import { get } from "lodash-es";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolderOpen } from "react-icons/ai";
import { FiEye } from "react-icons/fi";
import { RiBox3Line } from "react-icons/ri";

type TreeItemProps = NodeRendererProps<any> & {
  onFocusNode: (node: any) => void;
};

function renderIcon(data: any) {
  if (data.isDirectory) {
    return <AiFillFolderOpen color="#d6d6d6" />;
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

export function TreeItem({ node, style, dragHandle, onFocusNode }: TreeItemProps) {
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
      'h-full w-full items-center justify-between rounded-sm px-1 text-[12px] text-[#d6d6d6] hover:cursor-pointer hover:bg-[#303846]',
      node.isSelected && 'bg-[#304766] text-[#f0f0f0]'
    )}
    onDoubleClick={() => onFocusNode(node)}
    onContextMenu={(e) => handleContextMenu(e, node.data)}
  >
    <Center>
      <Box className="m-auto w-4 shrink-0">{renderIcon(node.data)}</Box>
      <Box className={clsx('truncate font-semibold', node.isSelected ? 'text-[#ffffff]' : 'text-[#d6d6d6]')}>{node.data.tag}</Box>
      {renderName(node)}
    </Center>
    <button
      type="button"
      className="ml-1 flex shrink-0 rounded p-0.5 text-[#aeb8c5] hover:bg-[#49637f] hover:text-white"
      title="Focus in preview"
      aria-label="Focus in preview"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onFocusNode(node)
      }}
    >
      <FiEye size={14} />
    </button>
  </HStack >
}
