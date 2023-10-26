import { useEffect } from 'react'

import { ScrollAblePanel } from '../component/common'

export default function ConsolePanel() {
  useEffect(() => {}, [])

  // Necessary because we will have to use Greet as a component later.
  return <ScrollAblePanel>ConsolePanel</ScrollAblePanel>
}
