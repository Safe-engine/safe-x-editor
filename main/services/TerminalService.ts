import { GlobalData } from "@@/parser/global";
import { execSync } from "child_process";
import { log } from "console";
import portscanner from "portscanner";

export function lintFile(filePath: string) {
  const cmd = `eslint --fix ${filePath.replace(GlobalData.rootProject, '.')}`
  // log(cmd, GlobalData.rootProject)
  const res = execSync(cmd, { cwd: GlobalData.rootProject })
  // if (res) log(res.toString())
}

export function startEditorScene() {
  const port = 10234;
  portscanner.checkPortStatus(port, '127.0.0.1', function (error, status) {
    // Status is 'open' if currently in use or 'closed' if available
    console.log(status)
    if (status === 'closed') {
      const cmd = `parcel .safex/editor.html -p ${port}`
      log(cmd, GlobalData.rootProject)
      // const res = execSync(cmd, { cwd: GlobalData.rootProject })
      // if (res) log(res.toString())
    }
  })
}
