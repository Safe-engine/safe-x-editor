import { sendRequest } from 'app/app.ipc';
import { parseStringFromValue } from 'helper/node';
import { memo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2 } from 'react-icons/fi';
import { UPDATE_PROJECT_COLORS_REQUEST } from 'shared/constant.message';
import { useActions, useSelector } from 'states/app.context';
import { selectAssets, selectColors, selectRootFolder, selectSelectedNode } from 'states/app.selectors';
import CapInsetsField from './CapInsetsField';
import ColorEditorDialog from './ColorEditorDialog';
import SpriteFrameField from './SpriteFrameField';

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseValue(value, previousValue) {
  if (typeof previousValue === 'boolean') return value === 'true';
  if (typeof previousValue === 'number') return parseNumber(value, previousValue);
  return value;
}

function parseVec2(position = 'Vec2(0,0)') {
  const [x = 0, y = 0] = String(position).replace('Vec2(', '').replace(')', '').split(',').map(Number);
  return { x, y };
}

function getNodePosition(node = {}) {
  if (node.position) return parseVec2(node.position);
  if (node.xy) {
    const [x = 0, y = 0] = node.xy;
    return { x, y };
  }
  return { x: node.x ?? 0, y: node.y ?? 0 };
}

function buildPositionUpdate(node, x, y) {
  if (node.position !== undefined) return { position: `Vec2(${x},${y})`, x: undefined, y: undefined, xy: undefined };
  if (node.x !== undefined || node.y !== undefined) return { x, y, position: undefined, xy: undefined };
  return { xy: [x, y], position: undefined, x: undefined, y: undefined };
}

function getTextureSize(spriteFrame, assets) {
  const frameName = parseStringFromValue(spriteFrame);
  if (!frameName) return { width: 0, height: 0 };

  const textures = assets?.assetsTextureList || [];
  const spriteFrameAsset = assets?.spriteFramesAssets?.find((asset) => asset.key === frameName);
  const texture = textures.find((asset) => (
    asset.key === frameName || asset.key === spriteFrameAsset?.value || asset.value === spriteFrameAsset?.value
  ));

  return {
    width: texture?.size?.width ?? 0,
    height: texture?.size?.height ?? 0,
  };
}

function Field({ label, value, onChange }) {
  const isJsonValue = isObject(value) || Array.isArray(value);
  const inputClassName = 'h-6 w-full min-w-0 rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]';

  function onChangeValue(event) {
    const nextValue = event.target.value;
    if (!isJsonValue) {
      onChange(parseValue(nextValue, value));
      return;
    }
    try {
      onChange(JSON.parse(nextValue));
    } catch (error) {
      return;
    }
  }

  if (typeof value === 'boolean') {
    return (
      <label className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
        <div className='truncate text-[11px] text-[#c8c8c8]' title={label}>{label}</div>
        <input
          className='h-3.5 w-3.5 accent-[#6aa7ff]'
          type='checkbox'
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  }

  return (
    <label className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-start gap-2 px-2 py-0.5'>
      <div className='truncate pt-1 text-[11px] text-[#c8c8c8]' title={label}>{label}</div>
      {isJsonValue ? (
        <textarea
          className='min-h-14 w-full min-w-0 resize-y rounded-sm border border-[#111] bg-[#151515] px-2 py-1 font-mono text-[11px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]'
          value={JSON.stringify(value, null, 2)}
          onChange={onChangeValue}
        />
      ) : (
        <input
          className={inputClassName}
          type={typeof value === 'number' ? 'number' : 'text'}
          value={value ?? ''}
          onChange={onChangeValue}
        />
      )}
    </label>
  );
}

function AxisInput({ axis, value, color, step = 1, onChange }) {
  return (
    <div className='flex h-6 min-w-0 items-center border border-[#111] bg-[#151515]'>
      <span className='w-4 shrink-0 text-center text-[11px] font-bold' style={{ color }}>{axis}</span>
      <input
        className='h-full min-w-0 flex-1 bg-transparent pr-1 text-right text-[11px] font-semibold text-[#f0f0f0] outline-none'
        type='number'
        step={step}
        value={value}
        onChange={(event) => onChange(parseNumber(event.target.value, value))}
      />
    </div>
  );
}

function AxisRow({ label, values, step, onChange }) {
  const axes = [
    { key: 'x', label: 'X', color: '#ff6565' },
    { key: 'y', label: 'Y', color: '#71d36b' },
  ];

  return (
    <div className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
      <div className='truncate text-[11px] text-[#c8c8c8]'>{label}</div>
      <div className='grid min-w-0 grid-cols-2 gap-1'>
        {axes.map((axis) => (
          <AxisInput
            key={axis.key}
            axis={axis.label}
            color={axis.color}
            step={step}
            value={values[axis.key] ?? 0}
            onChange={(nextValue) => onChange(axis.key, nextValue)}
          />
        ))}
      </div>
    </div>
  );
}

function ColorField({ value, colors, onChange, onEdit }) {
  return (
    <label className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
      <div className='truncate text-[11px] text-[#c8c8c8]'>Color</div>
      <div className='flex min-w-0 gap-1'>
        <select
          className='h-6 min-w-0 flex-1 rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]'
          value={parseStringFromValue(value) ?? ''}
          onChange={(event) => onChange(event.target.value || undefined)}
        >
          <option value=''>Default</option>
          {colors.map((color) => <option key={color.key} value={color.key}>{color.key}</option>)}
        </select>
        <button className='flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-[#111] bg-[#303030] text-[#bdbdbd] hover:text-[#f0f0f0]' onClick={onEdit} title='Edit project colors'>
          <FiEdit2 size={13} />
        </button>
      </div>
    </label>
  );
}

function InspectorSection({ title, children }) {
  return (
    <details className='border-b border-[#141414]' open>
      <summary className='flex h-8 cursor-default select-none items-center bg-[#202020] px-2 text-[11px] font-bold uppercase text-[#dcdcdc] marker:text-[#a8c7ff]'>
        <span className='ml-1'>{title}</span>
        <span className='ml-auto text-lg leading-none text-[#bdbdbd]'>⋮</span>
      </summary>
      <div className='bg-[#252525] py-1'>{children}</div>
    </details>
  );
}

function EmptyValue({ children }) {
  return <div className='px-2 py-2 text-[11px] text-[#777]'>{children}</div>;
}

function PropGroup({ title, children }) {
  return (
    <div className='mb-1'>
      <div className='mx-2 mb-1 mt-1 border-b border-[#343434] pb-0.5 text-[10px] uppercase tracking-wide text-[#9f9f9f]'>
        {title}
      </div>
      {children}
    </div>
  );
}

function NodeHeader({ selectedNode, active, onActiveChange }) {
  return (
    <div className='flex min-h-14 items-center border-b border-[#151515] bg-[#242424] px-2 py-2'>
      <div className='mr-2 flex h-8 w-8 shrink-0 items-center justify-center bg-[#303030] text-[#dcdcdc]'>
        <div className='h-3.5 w-3.5 rounded-full bg-[#dcdcdc]' />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-[12px] font-bold text-[#f0f0f0]'>{selectedNode.tag}
          <span className='truncate'>: {selectedNode.props?.node?.name || ''}</span>
        </div>
        <div className='mt-1 flex min-w-0 gap-2 text-[10px] font-semibold uppercase tracking-wide text-[#d5d5d5]'>
          <span className='truncate'>Tag: {selectedNode.props?.node?.tag || 'default'}</span>
        </div>
      </div>
      <div className='mt-1 flex min-w-0 gap-2 text-[10px] font-semibold uppercase tracking-wide text-[#d5d5d5]'>
        Active
      </div>
      <input
        className='ml-2 h-3.5 w-3.5 accent-[#6aa7ff]'
        type='checkbox'
        checked={active}
        onChange={(event) => onActiveChange(event.target.checked)}
      />
    </div>
  );
}

function NodeProps() {
  const { getFiles, updateMultiNodes } = useActions();
  const assets = useSelector(selectAssets);
  const colors = useSelector(selectColors);
  const rootFolder = useSelector(selectRootFolder);
  const selectedNode = useSelector(selectSelectedNode);
  const [isColorEditorOpen, setIsColorEditorOpen] = useState(false);

  async function saveColors(nextColors) {
    const response: any = await sendRequest({ key: UPDATE_PROJECT_COLORS_REQUEST, rootFolder, colors: nextColors });
    if (!response?.success) {
      toast.error(response?.message || 'Unable to save project colors');
      return false;
    }
    getFiles(rootFolder);
    window.postMessage({ type: 'reloadProjectData' }, '*');
    return true;
  }

  function updatePreview(component, updated) {
    window.postMessage({ type: 'updateSelectedNode', component, updated }, '*');
  }

  function updateProps(updated) {
    updateMultiNodes([{ component: 'props', updated }]);
    updatePreview('props', updated);
  }

  function updateNodeProps(updated) {
    const node = {
      ...(selectedNode.props?.node || {}),
      ...updated,
    };
    updateMultiNodes([{ component: 'props', updated: { node } }]);
    updatePreview('props', {
      node: {
        ...updated,
      },
    });
  }

  function updatePropGroup(groupName, groupValue) {
    updateProps({
      [groupName]: {
        ...(selectedNode.props?.[groupName] || {}),
        ...groupValue,
      },
    });
  }

  function updateComponents(components) {
    updateMultiNodes([{ component: 'components', updated: components }]);
    updatePreview('components', components);
  }

  function updateComponent(index, updated) {
    const components = [...(selectedNode.components || [])];
    components[index] = {
      ...components[index],
      ...updated,
    };
    updateComponents(components);
  }

  function updateComponentProps(index, updated) {
    const component = selectedNode.components[index];
    updateComponent(index, {
      props: {
        ...(component.props || {}),
        ...updated,
      },
    });
  }

  function isSpriteComponent(component) {
    return component.tag === 'Sprite';
  }

  if (!selectedNode) {
    return (
      <div className='p-3 text-[12px] text-[#8f8f8f]'>
        Select a node to edit its properties.
      </div>
    );
  }

  const props = selectedNode.props || {};
  const node = props.node || {};
  const position = getNodePosition(node);
  const textureSize = getTextureSize(props.spriteFrame, assets);
  const components = selectedNode.components || [];
  const propEntries = Object.entries(props).filter(([key]) => key !== 'node');

  return (<div className='h-screen overflow-y-auto bg-[#252525] pb-4'>
    <NodeHeader
      selectedNode={selectedNode}
      active={node.active !== false}
      onActiveChange={(active) => updateNodeProps({ active })}
    />
    <InspectorSection title='Transform'>
      <AxisRow
        label='Position'
        values={{ x: position.x, y: position.y }}
        onChange={(axis, nextValue) => {
          const nextPosition = { ...position, [axis]: nextValue };
          updateNodeProps(buildPositionUpdate(node, nextPosition.x, nextPosition.y));
        }}
      />
      <Field
        label='Rotation'
        value={node.rotation ?? 0}
        onChange={(rotation) => updateNodeProps({ rotation })}
      />
      <AxisRow
        label='Scale'
        step={0.1}
        values={{ x: node.scaleX ?? node.scale ?? 1, y: node.scaleY ?? node.scale ?? 1 }}
        onChange={(axis, nextValue) => {
          const propName = axis === 'x' ? 'scaleX' : 'scaleY';
          updateNodeProps({ [propName]: nextValue, scale: undefined });
        }}
      />
      <AxisRow
        label='Size'
        values={{ x: node.width ?? textureSize.width, y: node.height ?? textureSize.height }}
        onChange={(axis, value) => updateNodeProps({ [axis === 'x' ? 'width' : 'height']: value })}
      />
      <ColorField
        value={node.color}
        colors={colors}
        onChange={(color) => updateNodeProps({ color })}
        onEdit={() => setIsColorEditorOpen(true)}
      />
      {Object.entries(node)
        .filter(([key]) => !['position', 'xy', 'x', 'y', 'z', 'rotation', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'width', 'height', 'color', 'active'].includes(key))
        .map(([key, value]) => (
          <Field
            key={key}
            label={key}
            value={value}
            onChange={(nextValue) => updateNodeProps({ [key]: nextValue })}
          />
        ))}
    </InspectorSection>
    {propEntries.length > 0 && (
      <InspectorSection title='Properties'>
        {propEntries.filter(([key]) => key !== 'capInsets').map(([key, value]) => (
          isObject(value) ? (
            <PropGroup key={key} title={key}>
              {Object.entries(value).map(([childKey, childValue]) => (
                <Field
                  key={`${key}.${childKey}`}
                  label={childKey}
                  value={childValue}
                  onChange={(nextValue) => updatePropGroup(key, { [childKey]: nextValue })}
                />
              ))}
            </PropGroup>
          ) : (
            key === 'spriteFrame' ? (
              <SpriteFrameField
                key={key}
                value={value}
                textures={assets?.assetsTextureList || []}
                rootFolder={rootFolder}
                onChange={(nextValue) => updateProps({ [key]: nextValue })}
              />
            ) : (
              <Field
                key={key}
                label={key}
                value={value}
                onChange={(nextValue) => updateProps({ [key]: nextValue })}
              />
            )
          )
        ))}
        {props.spriteFrame !== undefined && (
          <CapInsetsField
            value={props.capInsets}
            spriteFrame={props.spriteFrame}
            textures={assets?.assetsTextureList || []}
            rootFolder={rootFolder}
            onChange={(nextValue) => updateProps({ capInsets: nextValue })}
          />
        )}
      </InspectorSection>
    )}
    {components.length === 0 && (
      <InspectorSection title='Components'>
        <EmptyValue>No components.</EmptyValue>
      </InspectorSection>
    )}
    {components.map((component, index) => (
      <InspectorSection key={`${component.tag}-${index}`} title={component.tag || `Component ${index + 1}`}>
        {Object.entries(component.props || {}).filter(([key]) => key !== 'capInsets').map(([key, value]) => (
          key === 'spriteFrame' ? (
            <SpriteFrameField
              key={`${component.tag}-${index}-${key}`}
              value={value}
              textures={assets?.assetsTextureList || []}
              rootFolder={rootFolder}
              onChange={(nextValue) => updateComponentProps(index, { [key]: nextValue })}
            />
          ) : (
            <Field
              key={`${component.tag}-${index}-${key}`}
              label={key}
              value={value}
              onChange={(nextValue) => updateComponentProps(index, { [key]: nextValue })}
            />
          )
        ))}
        {isSpriteComponent(component) && (
          <CapInsetsField
            value={component.props?.capInsets}
            spriteFrame={component.props?.spriteFrame}
            textures={assets?.assetsTextureList || []}
            rootFolder={rootFolder}
            onChange={(nextValue) => updateComponentProps(index, { capInsets: nextValue })}
          />
        )}
      </InspectorSection>
    ))}
    <div className='px-3 pt-3'>
      <button className='h-8 w-full rounded-sm bg-[#333] text-[11px] font-bold uppercase text-[#f3f3f3] shadow-inner'>
        + Add Component
      </button>
    </div>
    <ColorEditorDialog
      colors={colors}
      isOpen={isColorEditorOpen}
      onClose={() => setIsColorEditorOpen(false)}
      onSave={saveColors}
    />
  </div>);
}

export default memo(NodeProps);
