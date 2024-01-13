import React, { memo, useContext } from 'react';
import { updateTextTag } from 'states/app.action';
import { AppContext } from 'states/app.context';
import { selectEditingText } from 'states/app.selectors';

function ComponentProp({ props, name }) {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const text = useSelector(selectEditingText);

  function onChangeText(event) {
    dispatch(updateTextTag(event.target.value));
  }

  return (<div>{name}
    {props.map()}
  </div>);
}

export default memo(ComponentProp);
