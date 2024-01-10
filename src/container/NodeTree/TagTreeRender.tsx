import React, { memo, useContext } from 'react';
import { updateTextTag } from 'states/app.action';
import { AppContext } from 'states/app.context';
import { selectEditingText } from 'states/app.selectors';

function TagTreeRender({ editing, name }) {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const text = useSelector(selectEditingText);

  function onChangeText(event) {
    dispatch(updateTextTag(event.target.value));
  }

  const handleFocus = (event) => event.target.select();

  if (editing) {
    return <input className='text-white bg-yellow-800 p-1'
      autoFocus
      // onFocus={handleFocus}
      onChange={onChangeText} value={text} />;
  }

  return (<span>{name}</span>);
}

export default memo(TagTreeRender);
