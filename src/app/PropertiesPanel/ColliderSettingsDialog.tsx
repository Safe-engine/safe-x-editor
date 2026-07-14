import Modal from "base/Modal";
import { useEffect, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";

function resizeMatrix(matrix, size) {
  return Array.from({ length: size }, (_, rowIndex) => (
    Array.from({ length: size }, (_, columnIndex) => Boolean(matrix?.[rowIndex]?.[columnIndex]))
  ));
}

function parseMatrix(value, size) {
  try {
    const matrix = typeof value === 'string' ? JSON.parse(value) : value;
    return resizeMatrix(Array.isArray(matrix) ? matrix : [], size);
  } catch {
    return resizeMatrix([], size);
  }
}

export function ColliderSettingsDialog({ isOpen, groups, colliderMatrix, onClose, onSave }) {
  const [groupsList, setGroupsList] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setGroupsList(groups);
    setMatrix(parseMatrix(colliderMatrix, groups.length));
  }, [isOpen, groups, colliderMatrix]);

  function updateGroup(index, value) {
    setGroupsList((current) => current.map((group, groupIndex) => groupIndex === index ? value : group));
  }

  function addGroup() {
    setGroupsList((current) => {
      let number = current.length + 1;
      while (current.includes(`Group${number}`)) number += 1;
      return [...current, `Group${number}`];
    });
    setMatrix((current) => resizeMatrix(current, current.length + 1));
  }

  function removeGroup(index) {
    setGroupsList((current) => current.filter((_, groupIndex) => groupIndex !== index));
    setMatrix((current) => current
      .filter((_, rowIndex) => rowIndex !== index)
      .map((row) => row.filter((_, columnIndex) => columnIndex !== index)));
  }

  function toggleCollision(rowIndex, columnIndex) {
    setMatrix((current) => current.map((row, currentRowIndex) => (
      row.map((value, currentColumnIndex) => (
        currentRowIndex === rowIndex && currentColumnIndex === columnIndex ? !value : value
      ))
    )));
  }

  async function save() {
    const groupIndexes = groupsList.reduce((indexes, group, index) => group.trim() ? [...indexes, index] : indexes, []);
    const savedGroups = groupIndexes.map((index) => groupsList[index].trim());
    const savedMatrix = groupIndexes.map((rowIndex) => groupIndexes.map((columnIndex) => matrix[rowIndex][columnIndex]));
    setSaving(true);
    const saved = await onSave(savedGroups, JSON.stringify(savedMatrix));
    setSaving(false);
    if (saved) onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Collider Settings'>
      <div className='mt-4 w-[520px] text-[12px]'>
        <div className='flex items-center justify-between'>
          <div className='text-[11px] text-[#c8c8c8]'>Collider matrix</div>
          <button className='flex items-center gap-1 text-[11px] text-[#a8c7ff] hover:text-[#d7e6ff]' type='button' onClick={addGroup}>
            <FiPlus /> Add group
          </button>
        </div>
        <div className='mt-1 max-h-64 overflow-auto rounded-sm border border-[#111] bg-[#151515] p-2'>
          {groupsList.length === 0 ? (
            <div className='text-[11px] text-[#8f8f8f]'>Add a group to configure collisions.</div>
          ) : (
            <table className='border-separate border-spacing-1 text-[11px] text-[#c8c8c8]'>
              <thead>
                <tr>
                  <th className='min-w-32 px-1 text-left font-normal'>Group</th>
                  {groupsList.map((group, index) => <th className='min-w-12 truncate font-normal' key={index} title={group}>{group || `Group ${index + 1}`}</th>)}
                </tr>
              </thead>
              <tbody>
                {groupsList.map((group, rowIndex) => (
                  <tr key={rowIndex}>
                    <th className='px-1 font-normal'>
                      <div className='flex min-w-32 gap-1'>
                        <input
                          className='h-7 min-w-0 flex-1 rounded-sm border border-[#111] bg-[#1d1d1d] px-2 text-[#e2e2e2] outline-none focus:border-[#4a90e2]'
                          value={group}
                          onChange={(event) => updateGroup(rowIndex, event.target.value)}
                          aria-label={`Collision group ${rowIndex + 1}`}
                        />

                      </div>
                    </th>
                    {groupsList.map((columnGroup, columnIndex) => (
                      <td className='text-center' key={columnIndex}>
                        <input
                          className='h-3.5 w-3.5 accent-[#6aa7ff]'
                          type='checkbox'
                          checked={matrix[rowIndex]?.[columnIndex] || false}
                          onChange={() => toggleCollision(rowIndex, columnIndex)}
                          aria-label={`${group || `Group ${rowIndex + 1}`} collides with ${columnGroup || `Group ${columnIndex + 1}`}`}
                        />
                      </td>
                    ))}
                    <button className='flex h-7 w-7 items-center justify-center text-[#bdbdbd] hover:text-[#ff6565]' type='button' onClick={() => removeGroup(rowIndex)} title='Remove group'>
                      <FiTrash2 />
                    </button>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className='mt-4 flex justify-end gap-2'>
          <button className='h-8 rounded-sm px-3 text-[11px] text-[#dcdcdc] hover:bg-[#333]' type='button' onClick={onClose}>Cancel</button>
          <button className='h-8 rounded-sm bg-[#333] px-3 text-[11px] font-bold uppercase text-[#f3f3f3] hover:bg-[#3d3d3d]' type='button' disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
}
