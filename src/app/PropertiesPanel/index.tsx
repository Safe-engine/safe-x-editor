import NodeProps from './NodeProps';

export default function PropertiesPanel() {
  return (
    <div className='h-screen bg-[#252526] text-[#cccccc]'>
      <div className='flex h-screen'>
        <div className='w-full min-w-0'>
          <NodeProps />
        </div>
      </div>
    </div>
  );
}
