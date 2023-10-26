import { faCaretDown, faCaretRight, faFolder } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Disclosure } from '@headlessui/react'
import { useState } from 'react'

interface Props {
  data: any
  depth?: number
}

export default function TreeView({ data, depth = 0 }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Disclosure defaultOpen={open}>
      {({ open }) => (
        <>
          <Disclosure.Button className="block" style={{ marginLeft: depth * 24 }}>
            {!!data.children && <FontAwesomeIcon className="text-indigo-300 px-1" icon={faFolder} />}
            {data.name}
            {!!data.children && <FontAwesomeIcon className="px-1" icon={open ? faCaretDown : faCaretRight} />}
          </Disclosure.Button>
          <Disclosure.Panel>
            {data.children && data.children.map((child) => <TreeView data={child} key={child.path} depth={depth + 1} />)}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
}
