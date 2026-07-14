function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNodeString(value) {
  const stringValue = String(value ?? '');
  return stringValue.replace(/^(?:"(.*)"|'(.*)')$/, '$1$2');
}

function NodeIdentityRow({ node, onNameChange, onTagChange }) {
  const inputClassName = 'h-6 min-w-0 rounded-sm border border-[#111] bg-[#151515] px-2 text-[11px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]';

  return (
    <div className='grid min-h-7 grid-cols-[minmax(0,1fr)_84px] gap-2 px-2 py-0.5'>
      <label className='grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#d5d5d5]'>
        Name
        <input
          aria-label='Name'
          className={inputClassName}
          placeholder='Name'
          type='text'
          value={parseNodeString(node.name)}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>
      <label className='grid min-w-0 grid-cols-[24px_minmax(0,1fr)] items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#d5d5d5]'>
        Tag
        <input
          aria-label='Tag'
          className={inputClassName}
          type='number'
          value={node.tag ?? 0}
          onChange={(event) => onTagChange(parseNumber(event.target.value, node.tag ?? 0))}
        />
      </label>
    </div>
  );
}

export default NodeIdentityRow;
