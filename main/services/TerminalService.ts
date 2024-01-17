import { GlobalData } from "@@/parser/global";
import { execSync } from "child_process";
import { log } from "console";

export function lintFile(filePath: string) {
  const cmd = `eslint --fix ${filePath.replace(GlobalData.rootProject, '.')}`
  // log(cmd, GlobalData.rootProject)
  const res = execSync(cmd, { cwd: GlobalData.rootProject })
  // if (res) log(res.toString())
}