import { useSelector } from 'states/app.context';
import { selectSelectedFilePath } from 'states/app.selectors';
import NodeProps from './NodeProps';

export default function PropertiesPanel() {
  const selectedFilePath = useSelector(selectSelectedFilePath);

  return (
    <div className='w-full bg-[#252526] text-[#cccccc]'>
      <div className='flex h-full'>
        <div className='w-full min-w-0'>
          <NodeProps key={selectedFilePath} />
        </div>
      </div>
    </div>
  );
}
