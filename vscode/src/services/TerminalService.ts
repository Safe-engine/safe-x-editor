import { spawnSync } from "child_process";
import { join } from "path";
import { window, workspace } from "vscode";
import { GlobalData } from "../parser/global";

export function lintFile(filePath: string) {
  const relativePath = filePath.replace(GlobalData.rootProject, '.')
  const eslintPath = join(
    GlobalData.rootProject,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'eslint.cmd' : 'eslint'
  );
  const args = ['--fix', relativePath]
  const config = workspace.getConfiguration('safexEditor');
  const nodeVersion = config.get<string>('nodeVersion');
  console.log('Node version from CLI:', nodeVersion); // e.g. 'v20.11.1'
  console.log(`Running: ${eslintPath} ${args.join(' ')}`, GlobalData.rootProject)

  const result = spawnSync(eslintPath, args, {
    cwd: GlobalData.rootProject,
    // stdio: 'inherit', // In trực tiếp ra console
    shell: true,     // Không cần shell khi dùng spawnSync đúng cách
    encoding: 'utf-8',
    env: {
      ...process.env,
      // PATH: process.env.PATH + ':/usr/local/bin' // hoặc nơi bạn cài node
      PATH: process.env.PATH + ':' + process.env.HOME + `/.nvm/versions/node/${nodeVersion}/bin`
    }
  })
  if (result.error) {
    window.showErrorMessage(`Error: ${result.error.message}`);
    return;
  }

  if (result.stderr) {
    console.error(`stderr: ${result.stderr}`);
  }

  if (result.stdout) {
    console.log(`stdout: ${result.stdout}`);
  }

  if (result.status === 0) {
    window.showInformationMessage(`Saved scene ${filePath}`);
  } else {
    window.showErrorMessage(`ESLint failed with code ${result.status}`);
  }
}
