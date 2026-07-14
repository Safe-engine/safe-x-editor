import { sendRequest } from 'app/app.ipc';
import SelectBox from 'base/SelectBox';
import { parseFloatFromValue, parseOutline, parseStringFromValue } from 'helper/node';
import { memo, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2, FiRotateCcw } from 'react-icons/fi';
import { GET_COLLIDER_SETTINGS_REQUEST, SAVE_COLLIDER_SETTINGS_REQUEST, UPDATE_PROJECT_COLORS_REQUEST } from 'shared/constant.message';
import { useActions, useSelector } from 'states/app.context';
import { selectAssets, selectColors, selectDesignResolution, selectRootFolder, selectSelectedNode } from 'states/app.selectors';
import CapInsetsField from './CapInsetsField';
import { ColliderSettingsDialog } from './ColliderSettingsDialog';
import ColorEditorDialog from './ColorEditorDialog';
import NodeIdentityRow from './NodeIdentityRow';
import { LABEL_DEFAULT_PROPS, SPINE_DEFAULT_PROPS, WIDGET_DIRECTIONS } from './NodeProps.constants';
import SpriteFrameField from './SpriteFrameField';
import WidgetInsets from './WidgetInsets';

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

function SpineSelectField({ label, value, items, onChange }) {
  const options = Array.from(new Set(['', ...items]));
  return (
    <label className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
      <div className='truncate text-[11px] text-[#c8c8c8]' title={label}>{label}</div>
      <SelectBox items={options} selected={value ?? ''} setSelected={onChange} />
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

function AxisRow({ label, values, step, onChange, onReset, isSize }) {
  const axes = [
    { key: 'x', label: isSize ? 'W': 'X', color: '#ff6565' },
    { key: 'y', label: isSize ? 'H' : 'Y', color: '#71d36b' },
  ];

  return (
    <div className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
      <div className='truncate text-[11px] text-[#c8c8c8]'>{label}</div>
      <div className='flex min-w-0 gap-1'>
        <div className='grid min-w-0 flex-1 grid-cols-2 gap-1'>
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
        {onReset && (
          <button
            className='flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-[#111] bg-[#303030] text-[#bdbdbd] hover:text-[#f0f0f0]'
            type='button'
            onClick={onReset}
            title='Reset size'
          >
            <FiRotateCcw size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function BoxColliderFields({ props, onChange }) {
  const [offsetX = 0, offsetY = 0] = String(props.offset ?? [0, 0]).match(/-?\d+(\.\d+)?/g)?.map(Number) || [];

  return (
    <>
      <AxisRow
        label='Size'
        isSize
        values={{ x: parseFloatFromValue(props.width) ?? 0, y: parseFloatFromValue(props.height) ?? 0 }}
        onChange={(axis, value) => onChange({ [axis === 'x' ? 'width' : 'height']: value })}
      />
      <div className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
        <div className='truncate text-[11px] text-[#c8c8c8]'>Offset</div>
        <div className='flex min-w-0 gap-1'>
          <div className='grid min-w-0 flex-1 grid-cols-2 gap-1'>
            <AxisInput axis='X' color='#ff6565' value={offsetX} onChange={(value) => onChange({ offset: [value, offsetY] })} />
            <AxisInput axis='Y' color='#71d36b' value={offsetY} onChange={(value) => onChange({ offset: [offsetX, value] })} />
          </div>
        </div>
      </div>
    </>
  );
}

function ColliderTagField({ value, groups, onChange, onEdit }) {
  const parsedTag = String(parseStringFromValue(value) ?? '').replace(/^['"]|['"]$/g, '').split('.').pop();
  const selectedTag = groups.includes(parsedTag) ? parsedTag : groups[0] || '';

  return (
    <label className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
      <div className='truncate text-[11px] text-[#c8c8c8]'>Tag</div>
      <div className='flex min-w-0 gap-1'>
        <select
          className='h-6 min-w-0 flex-1 rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]'
          value={selectedTag}
          onChange={(event) => onChange(event.target.value || undefined)}
        >
          <option value=''>None</option>
          {groups.map((group) => <option key={group} value={group}>{group}</option>)}
        </select>
        <button className='flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-[#111] bg-[#303030] text-[#bdbdbd] hover:text-[#f0f0f0]' type='button' onClick={onEdit} title='Edit collider groups'>
          <FiEdit2 size={13} />
        </button>
      </div>
    </label>
  );
}

function ColorField({ value, colors, onChange, onEdit }) {
  const colorName = parseStringFromValue(value) ?? '';
  const selectedColor = colors.find((color) => color.key === colorName);
  const [red = 0, green = 0, blue = 0, alpha = 255] = selectedColor?.value || [];
  const previewColor = selectedColor && `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;

  return (
    <label className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
      <div className='truncate text-[11px] text-[#c8c8c8]'>Color</div>
      <div className='flex min-w-0 gap-1'>
        <select
          className='h-6 min-w-0 flex-1 rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]'
          value={colorName}
          onChange={(event) => onChange(event.target.value || undefined)}
        >
          <option value=''>Default</option>
          {colors.map((color) => <option key={color.key} value={color.key}>{color.key}</option>)}
        </select>
        <div
          className='h-6 w-6 shrink-0 rounded-sm border border-[#111] bg-[#151515]'
          style={{ backgroundColor: previewColor }}
          title='Color preview'
        />
        <button className='flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-[#111] bg-[#303030] text-[#bdbdbd] hover:text-[#f0f0f0]' onClick={onEdit} title='Edit project colors'>
          <FiEdit2 size={13} />
        </button>
      </div>
    </label>
  );
}

function OutlineField({ value, colors, onChange }) {
  const [color = '', width = 0] = parseOutline(value);
  const selectedColor = colors.find((projectColor) => projectColor.key === color);
  const [red = 0, green = 0, blue = 0, alpha = 255] = selectedColor?.value || [];
  const previewColor = selectedColor && `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;

  function update(nextColor = color, nextWidth = width) {
    onChange(`{[${nextColor}, ${nextWidth}]}`);
  }

  return (
    <label className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
      <div className='truncate text-[11px] text-[#c8c8c8]'>Outline</div>
      <div className='flex min-w-0 gap-1'>
        <select
          className='h-6 min-w-0 flex-1 rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]'
          value={color}
          onChange={(event) => update(event.target.value)}
        >
          <option value=''>Color</option>
          {colors.map((projectColor) => <option key={projectColor.key} value={projectColor.key}>{projectColor.key}</option>)}
        </select>
        <div
          className='h-6 w-6 shrink-0 rounded-sm border border-[#111] bg-[#151515]'
          style={{ backgroundColor: previewColor }}
          title='Color preview'
        />
        <input
          className='h-6 w-16 shrink-0 rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]'
          type='number'
          min='0'
          step='1'
          value={width}
          onChange={(event) => update(color, parseNumber(event.target.value, width))}
        />
      </div>
    </label>
  );
}

function ShadowField({ value, colors, onChange }) {
  const values = Array.isArray(value)
    ? value
    : parseStringFromValue(value).replace(/^\[|\]$/g, '').split(',').map((item) => item.trim());
  const [color = '', width = 0, ...offset] = values;
  const [x = 0, y = 0] = offset.join(',').match(/-?\d+(\.\d+)?/g)?.map(Number) || [];

  function update(nextColor = color, nextWidth = width, nextX = x, nextY = y) {
    onChange(`{[${nextColor}, ${nextWidth}, Size(${nextX}, ${nextY})]}`);
  }

  return (
    <label className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
      <div className='truncate text-[11px] text-[#c8c8c8]'>Shadow</div>
      <div className='flex min-w-0 gap-1'>
        <select
          className='h-6 min-w-0 flex-1 rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]'
          value={color}
          onChange={(event) => update(event.target.value)}
        >
          <option value=''>Color</option>
          {colors.map((projectColor) => <option key={projectColor.key} value={projectColor.key}>{projectColor.key}</option>)}
        </select>
        {[
          { label: 'W', value: width, onChange: (nextValue) => update(color, nextValue) },
          { label: 'X', value: x, onChange: (nextValue) => update(color, width, nextValue) },
          { label: 'Y', value: y, onChange: (nextValue) => update(color, width, x, nextValue) },
        ].map((field) => (
          <div key={field.label} className='flex h-6 w-12 shrink-0 items-center border border-[#111] bg-[#151515]'>
            <span className='w-3 text-center text-[10px] font-bold text-[#c8c8c8]'>{field.label}</span>
            <input
              className='min-w-0 flex-1 bg-transparent pr-1 text-right text-[11px] text-[#e2e2e2] outline-none'
              type='number'
              value={field.value}
              onChange={(event) => field.onChange(parseNumber(event.target.value, field.value))}
            />
          </div>
        ))}
      </div>
    </label>
  );
}

function InspectorSection({ title, headerContent, children }) {
  return (
    <details className='border-b border-[#141414]' open>
      <summary className='flex h-8 cursor-default select-none items-center bg-[#202020] px-2 text-[11px] font-bold text-[#dcdcdc] marker:text-[#a8c7ff]'>
        <span className='ml-1'>{title.replace(/([a-z])([A-Z])/g, '$1 $2')}</span>
        {headerContent}
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

function NodeProps() {
  const { getFiles, updateMultiNodes } = useActions();
  const assets = useSelector(selectAssets);
  const colors = useSelector(selectColors);
  const designResolution = useSelector(selectDesignResolution);
  const rootFolder = useSelector(selectRootFolder);
  const selectedNode = useSelector(selectSelectedNode);
  const [isColorEditorOpen, setIsColorEditorOpen] = useState(false);
  const [editingBoxColliderIndex, setEditingBoxColliderIndex] = useState<number | null>(null);
  const [colliderGroups, setColliderGroups] = useState<string[]>([]);
  const [colliderMatrix, setColliderMatrix] = useState('[]');
  const [isColliderSettingsOpen, setIsColliderSettingsOpen] = useState(false);

  async function loadColliderSettings() {
    const settings: any = await sendRequest({ key: GET_COLLIDER_SETTINGS_REQUEST });
    const groups = Array.isArray(settings?.groupsList)
      ? settings.groupsList
      : String(settings?.groupsList || '').match(/"[^"]+"/g)?.map((group) => group.slice(1, -1)) || [];
    setColliderGroups(groups);
    setColliderMatrix(typeof settings?.colliderMatrix === 'string' ? settings.colliderMatrix : JSON.stringify(settings?.colliderMatrix || []));
  }

  useEffect(() => {
    if (rootFolder) void loadColliderSettings();
  }, [rootFolder]);

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

  async function saveColliderSettings(groups, matrixText) {
    let matrix;
    try {
      matrix = JSON.parse(matrixText);
    } catch {
      toast.error('Collider matrix must be valid JSON');
      return false;
    }
    if (!Array.isArray(matrix)) {
      toast.error('Collider matrix must be an array');
      return false;
    }
    const response: any = await sendRequest({ key: SAVE_COLLIDER_SETTINGS_REQUEST, groupsList: groups, colliderMatrix: matrix });
    if (!response?.success) {
      toast.error(response?.message || 'Unable to save collider settings');
      return false;
    }
    setColliderGroups(groups);
    setColliderMatrix(JSON.stringify(matrix));
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

  function toggleBoxColliderEditor(index) {
    const isEditing = editingBoxColliderIndex === index;
    setEditingBoxColliderIndex(isEditing ? null : index);
    window.postMessage({ type: 'toggleBoxColliderEditor', componentIndex: isEditing ? undefined : index }, '*');
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
  const spineData = assets?.spineAnimations?.[parseStringFromValue(props.data)];
  const defaultProps = selectedNode.tag === 'Label'
    ? LABEL_DEFAULT_PROPS
    : selectedNode.tag === 'SpineSkeleton'
      ? SPINE_DEFAULT_PROPS
      : {};
  const displayedProps = {
    ...props,
    ...Object.fromEntries(Object.entries(defaultProps).map(([key, value]) => [key, props[key] ?? value])),
  };
  const propEntries = Object.entries(displayedProps).filter(([key]) => key !== 'node');

  function getWidgetInset(direction, widgetProps) {
    const getInset = (key) => {
      if (widgetProps[key] === undefined || widgetProps[key] === null) return null;
      const value = Number(parseStringFromValue(widgetProps[key]));
      return Number.isFinite(value) ? value : null;
    };
    const top = getInset('top');
    const right = getInset('right');
    const bottom = getInset('bottom');
    const left = getInset('left');
    const anchorX = node.anchorX ?? 0.5;
    const anchorY = node.anchorY ?? 0.5;
    const width = left !== null && right !== null
      ? Math.max(0, designResolution.width - left - right)
      : node.width ?? textureSize.width;
    const height = top !== null && bottom !== null
      ? Math.max(0, designResolution.height - top - bottom)
      : node.height ?? textureSize.height;
    const x = left !== null
      ? left + width * anchorX
      : right !== null
        ? designResolution.width - right - width * (1 - anchorX)
        : position.x;
    const y = top !== null
      ? top + height * anchorY
      : bottom !== null
        ? designResolution.height - bottom - height * (1 - anchorY)
        : position.y;
    if (direction === 'top') return Math.round(y - height * anchorY);
    if (direction === 'right') return Math.round(designResolution.width - x - width * (1 - anchorX));
    if (direction === 'bottom') return Math.round(designResolution.height - y - height * (1 - anchorY));
    return Math.round(x - width * anchorX);
  }

  return (<div className='h-screen overflow-y-auto bg-[#252525] pb-4'>
    <InspectorSection
      title='Node'
      headerContent={<input
        className='ml-2 h-3.5 w-3.5 accent-[#6aa7ff]'
        type='checkbox'
        checked={node.active !== false}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => updateNodeProps({ active: event.target.checked })}
      />}
    >
      <NodeIdentityRow
        node={node}
        onNameChange={(name) => updateNodeProps({ name: JSON.stringify(name) })}
        onTagChange={(tag) => updateNodeProps({ tag })}
      />
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
        label='Anchor'
        step={0.01}
        values={{ x: node.anchorX ?? 0.5, y: node.anchorY ?? 0.5 }}
        onChange={(axis, value) => updateNodeProps({ [axis === 'x' ? 'anchorX' : 'anchorY']: value })}
      />
      <AxisRow
        label='Size'
        isSize
        values={{ x: node.width ?? textureSize.width, y: node.height ?? textureSize.height }}
        onChange={(axis, value) => updateNodeProps({ [axis === 'x' ? 'width' : 'height']: value })}
        onReset={() => updateNodeProps({ width: undefined, height: undefined })}
      />
      <Field
        label='zOrder'
        value={node.zOrder ?? node.zIndex ?? 0}
        onChange={(zOrder) => updateNodeProps({ zOrder })}
      />
      <ColorField
        value={node.color}
        colors={colors}
        onChange={(color) => updateNodeProps({ color })}
        onEdit={() => setIsColorEditorOpen(true)}
      />
      {Object.entries(node)
        .filter(([key]) => !['position', 'xy', 'x', 'y', 'z', 'rotation', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'width', 'height', 'anchorX', 'anchorY', 'zOrder', 'zIndex', 'name', 'tag', 'color', 'active'].includes(key))
        .map(([key, value]) => (
          <Field
            key={key}
            label={key}
            value={value}
            onChange={(nextValue) => updateNodeProps({ [key]: nextValue })}
          />
        ))}
    </InspectorSection>
    {(propEntries.length > 0 || selectedNode.tag === 'Sprite') && (
      <InspectorSection title={selectedNode.tag}>
        {propEntries.filter(([key]) => key !== 'capInsets' && key !== 'tiled').map(([key, value]) => (
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
            ) : key === 'outline' ? (
              <OutlineField
                key={key}
                value={value}
                colors={colors}
                onChange={(nextValue) => updateProps({ [key]: nextValue })}
              />
            ) : key === 'shadow' ? (
              <ShadowField
                key={key}
                value={value}
                colors={colors}
                onChange={(nextValue) => updateProps({ [key]: nextValue })}
              />
            ) : selectedNode.tag === 'SpineSkeleton' && key === 'skin' && spineData?.skins?.length ? (
              <SpineSelectField
                key={key}
                label={key}
                value={value}
                items={spineData.skins}
                onChange={(nextValue) => updateProps({ [key]: nextValue })}
              />
            ) : selectedNode.tag === 'SpineSkeleton' && key === 'animation' && spineData?.animations?.length ? (
              <SpineSelectField
                key={key}
                label={key}
                value={value}
                items={spineData.animations}
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
        {selectedNode.tag === 'Sprite' && (
          <Field
            label='Tiled'
            value={props.tiled ?? false}
            onChange={(tiled) => updateProps({ tiled })}
          />
        )}
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
      <InspectorSection
        key={`${component.tag}-${index}`}
        title={component.tag || `Component ${index + 1}`}
        headerContent={(component.tag === 'BoxCollider' || component.tag === 'PhysicsBoxCollider') && (
          <button
            className={`ml-2 flex h-5 w-5 items-center justify-center rounded-sm ${editingBoxColliderIndex === index ? 'bg-[#3569a8] text-white' : 'text-[#bdbdbd] hover:text-[#f0f0f0]'}`}
            type='button'
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleBoxColliderEditor(index);
            }}
            title={editingBoxColliderIndex === index ? 'Hide collider editor' : 'Edit collider in preview'}
          >
            <FiEdit2 size={13} />
          </button>
        )}
      >
        {(component.tag === 'BoxCollider' || component.tag === 'PhysicsBoxCollider') && (
          <>
            <BoxColliderFields props={component.props || {}} onChange={(updated) => updateComponentProps(index, updated)} />
            <ColliderTagField value={component.props?.tag} groups={colliderGroups} onChange={(tag) => updateComponentProps(index, { tag })} onEdit={() => setIsColliderSettingsOpen(true)} />
          </>
        )}
        {component.tag === 'Widget' && (
          <WidgetInsets
            props={component.props || {}}
            onChange={(updated) => updateComponentProps(index, updated)}
            onToggle={(direction, enabled) => updateComponentProps(index, {
              [direction]: enabled ? getWidgetInset(direction, component.props || {}) : undefined,
            })}
            onToggleCenter={(center, enabled) => updateComponentProps(index, center === 'centerVertical' ? {
              centerVertical: enabled || undefined,
              top: undefined,
              bottom: undefined,
            } : {
              centerHorizon: enabled || undefined,
              left: undefined,
              right: undefined,
            })}
          />
        )}
        {Object.entries(component.props || {}).filter(([key]) => (
          key !== 'capInsets'
          && key !== 'tiled'
          && (!['BoxCollider', 'PhysicsBoxCollider'].includes(component.tag) || !['tag', 'width', 'height', 'offset'].includes(key))
          && (component.tag !== 'Widget' || (
            !WIDGET_DIRECTIONS.some((direction) => direction.key === key)
            && !['centerVertical', 'centerHorizon'].includes(key)
          ))
        )).map(([key, value]) => (
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
          <>
            <Field
              label='Tiled'
              value={component.props?.tiled ?? false}
              onChange={(tiled) => updateComponentProps(index, { tiled })}
            />
            <CapInsetsField
              value={component.props?.capInsets}
              spriteFrame={component.props?.spriteFrame}
              textures={assets?.assetsTextureList || []}
              rootFolder={rootFolder}
              onChange={(nextValue) => updateComponentProps(index, { capInsets: nextValue })}
            />
          </>
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
    <ColliderSettingsDialog
      isOpen={isColliderSettingsOpen}
      groups={colliderGroups}
      colliderMatrix={colliderMatrix}
      onClose={() => setIsColliderSettingsOpen(false)}
      onSave={saveColliderSettings}
    />
  </div>);
}

export default memo(NodeProps);
