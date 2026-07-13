import NodeProps from './NodeProps';
import { useSelector } from 'states/app.context';
import { selectSelectedFilePath } from 'states/app.selectors';

export default function PropertiesPanel() {
  const selectedFilePath = useSelector(selectSelectedFilePath);

  return (
    <div className='h-screen bg-[#252526] text-[#cccccc]'>
      <div className='flex h-screen'>
        <div className='w-full min-w-0'>
          <NodeProps key={selectedFilePath} />
        </div>
      </div>
    </div>
  );
}
