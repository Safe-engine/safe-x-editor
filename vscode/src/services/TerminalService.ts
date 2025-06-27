import { spawnSync } from "child_process";
import { log } from "console";
import { GlobalData } from "../parser/global";

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
