import { useEffect } from 'react'

import { ScrollAblePanel } from '../components/common'

export default function PropertiesPanel() {
  useEffect(() => { }, [])

  // Necessary because we will have to use Greet as a component later.
  return <ScrollAblePanel>Props</ScrollAblePanel>
}
