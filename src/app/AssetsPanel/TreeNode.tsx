import clsx from "clsx";
import { NodeRendererProps } from "react-arborist";
import { AiFillFolder, AiFillFolderOpen } from "react-icons/ai";
import { GiSkeletonInside } from "react-icons/gi";
import { Box, Center, HStack } from "../../base/Stack";
import { useActions } from "../../states/app.context";

function Sprite({ src, rect, naturalSize, className }) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="bg-no-repeat"
        style={{
          scale: 24 / rect.h,
          width: rect.w,
          height: rect.h,
          backgroundImage: `url(${src})`,
          backgroundPosition: `-${rect.x}px -${rect.y}px`,
          backgroundSize: `${naturalSize.w}px ${naturalSize.h}px`,
          // transform: `translate(-${rect.x}px, -${rect.y}px)`,
          translate: `-20px -24px`,
        }}
      />
    </div>
  );
}

function renderIcon(node: any) {
  const { data, isOpen } = node
  if (data.isDirectory) {
    return isOpen ? <AiFillFolderOpen color="white" /> : <AiFillFolder color="white" />;
  }
  if (data.type === 'dragonBones') {
    return <GiSkeletonInside color="blue" />;
  }
  if (data.type === 'frame') {
    // console.log('data', data.json);
    const { frame } = data.json.frames[data.name]
    return <Sprite
      className={"w-[24px] h-[24px]"}
      src={data.texture}
      rect={frame}
      naturalSize={data.json.meta.size}
    />
  }
  return <img src={data.value} style={{ width: 24, height: 24 }} />;
}

function getNodeName(data) {
  const { key = '', name, isDirectory, type } = data
  if (type === 'frame') {
    return name
  }
  return isDirectory ? name : key.replaceAll('sf_', '').replaceAll('db_', '').replaceAll('_json', '');
}

export function TreeNode({ node, style, dragHandle }: NodeRendererProps<any>) {
  const { setDragNode } = useActions()

  const handleContextMenu = (
    e: React.MouseEvent,
    node: any
  ) => {
    e.preventDefault();
    // openMenu(node, { x: e.clientX, y: e.clientY });
  };

  return <HStack ref={dragHandle}
    className={clsx(
      'hover:cursor-pointer hover:bg-gray-500',
      node.isSelected && 'bg-gray-500'
    )}

    onDragStart={(event) => {
      // console.log('onDragStart node', node.data.path)
      setDragNode(node.data.path)
    }}
    onContextMenu={(e) => handleContextMenu(e, node.data)}
  >
    <Center>
      <Box style={style} className="m-auto">{renderIcon(node)}</Box>
      <Box className={clsx(node.isSelected ? 'text-yellow-400' : 'text-white')}>{getNodeName(node.data)}</Box>
    </Center>
  </HStack >
}