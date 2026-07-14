import { GlobalData } from "@@/parser/global";
import { execSync, spawnSync } from "child_process";
import { log } from "console";

export function lintFile(filePath: string) {
  const relativePath = filePath.replace(GlobalData.rootProject, '.')
  const cmd = './node_modules/.bin/eslint'
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

export function syncResConst(rootFolder?: string) {
  const cwd = rootFolder || GlobalData.rootProject;
  log(`Running: bun run sync-res in ${cwd}`);
  execSync('bun run sync-res', { cwd, stdio: 'inherit' });
}

export function installDependencies(rootFolder?: string) {
  const cwd = rootFolder || GlobalData.rootProject;
  log(`Running: bun install in ${cwd}`);
  execSync('bun install', { cwd, stdio: 'inherit' });
}
