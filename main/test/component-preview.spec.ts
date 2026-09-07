import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadComponent } from '../services/ComponentService'

describe('component preview metadata', () => {
  it('marks ComponentX files for standalone preview', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'safe-x-editor-'))
    const filePath = join(folder, 'Example.tsx')
    writeFileSync(filePath, `import { ComponentX, Container } from '@safe-engine/sdl'

export default class Example extends ComponentX {
  __view() {
    <Container node={{ active: false }} />
  }
}
`)

    try {
      const component = await loadComponent({ path: filePath })
      expect(component.isComponentPreview).toBe(true)
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
