import pathUtils from 'path-browserify';
import { useSelector } from 'states/app.context';
import { selectSelectedFilePath } from 'states/app.selectors';
import NodeProps from './NodeProps';

export default function PropertiesPanel() {
  const filePath = useSelector(selectSelectedFilePath);

  function getComponentName(path) {
    let name = pathUtils.basename(path)
      .replace('.js', '')
      .replace('.tsx', '');
    if (name === 'index') {
      name = pathUtils.dirname(path);
    }
    return name;
  }

  return (
    <div className=''>
      <div className='flex h-screen'>
        <div className='w-full'>
          <div className='py-1 text-orange-50 font-bold text-center border-cool-gray-300 border-b'>Components</div>
          <NodeProps />
        </div>
      </div>
    </div>
  );
}
