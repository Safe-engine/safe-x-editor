import { GlobalData } from "@@/parser/global";
import { spawnSync } from "child_process";
import { log } from "console";
import portscanner from "portscanner";

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

export function startEditorScene() {
  const port = 10234;
  portscanner.checkPortStatus(port, '127.0.0.1', function (error, status) {
    // Status is 'open' if currently in use or 'closed' if available
    console.log(error, status)
    if (status === 'closed') {
      // const cmd = `npx parcel ./src/.safex/editor.html -p ${port}`
      const cmd = `npm run dev`
      log('#not fixed:', cmd, GlobalData.rootProject)
      // const res = spawnSync('npm.cmd', ['run', 'dev'], {
      //   cwd: GlobalData.rootProject,
      //   stdio: 'inherit'
      // })
      // if (res) log(res)
    }
  })
}
