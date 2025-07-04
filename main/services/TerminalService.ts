import { GlobalData } from "@@/parser/global";
import { spawnSync } from "child_process";
import { log } from "console";

export function lintFile(filePath: string) {
  const relativePath = filePath.replace(GlobalData.rootProject, '.')
  const cmd = 'eslint'
  const args = ['--fix', relativePath]

  log(`Running: ${cmd} ${args.join(' ')}`, GlobalData.rootProject)

  const res = spawnSync(cmd, args, {
    cwd: GlobalData.rootProject,
    stdio: 'inherit', // In trực tiếp ra console
    shell: false,     // Không cần shell khi dùng spawnSync đúng cách
  })

  if (res.error) {
    log('Lỗi khi chạy eslint:', res.error)
  } else if (res.status !== 0) {
    log(`eslint exited with code ${res.status}`)
  }
}

export function syncResConst() {
  const cmd = 'bun'
  const args = ['./node_modules/safex-sync-res/src/index.ts']

  log(`Running: ${cmd} ${args.join(' ')}`, GlobalData.rootProject)

  const res = spawnSync(cmd, args, {
    cwd: GlobalData.rootProject,
    stdio: 'inherit',
    shell: false,
  })

  if (res.error) {
    log('Lỗi khi chạy eslint:', res.error)
  } else if (res.status !== 0) {
    log(`eslint exited with code ${res.status}`)
  }
}
