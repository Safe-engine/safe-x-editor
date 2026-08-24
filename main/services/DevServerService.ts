import { ChildProcess, spawn } from 'child_process';
import { shell } from 'electron';
import { networkInterfaces } from 'os';

type DevServer = { process: ChildProcess; localUrl?: string; devUrl?: string };

const servers = new Map<string, DevServer>();

function getLanAddress() {
  for (const addresses of Object.values(networkInterfaces())) {
    const address = addresses?.find((item) => item.family === 'IPv4' && !item.internal);
    if (address) return address.address;
  }
}

function getPhoneUrl(localUrl: string) {
  const lanAddress = getLanAddress();
  return lanAddress ? localUrl.replace(/:\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, `://${lanAddress}`) : localUrl;
}

function openDevPage(server: DevServer) {
  if (!server.localUrl || !server.devUrl) throw Error('Dev server URL is unavailable.');
  void shell.openExternal(server.localUrl);
  return { url: server.devUrl };
}

export function runDevServer(rootFolder: string): Promise<{ url: string }> {
  if (!rootFolder) throw Error('No project is loaded.');
  const existing = servers.get(rootFolder);
  if (existing?.process.exitCode === null && existing.localUrl && existing.devUrl) return Promise.resolve(openDevPage(existing));

  return new Promise((resolve, reject) => {
    const process = spawn('bun', ['run', 'dev', '--', '--host', '0.0.0.0'], {
      cwd: rootFolder,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    const server: DevServer = { process };
    servers.set(rootFolder, server);
    const timeout = setTimeout(() => {
      servers.delete(rootFolder);
      process.kill();
      reject(new Error('Dev server did not report a URL within 30 seconds.'));
    }, 30_000);
    const readUrl = (output: Buffer) => {
      const url = output.toString().match(/https?:\/\/[^\s]+/)?.[0];
      if (!url || server.localUrl) return;
      server.localUrl = url;
      server.devUrl = getPhoneUrl(url);
      clearTimeout(timeout);
      resolve(openDevPage(server));
    };

    process.stdout?.on('data', readUrl);
    process.stderr?.on('data', readUrl);
    process.on('error', (error) => {
      clearTimeout(timeout);
      servers.delete(rootFolder);
      reject(error);
    });
    process.on('exit', (code) => {
      clearTimeout(timeout);
      servers.delete(rootFolder);
      if (!server.localUrl) reject(new Error(`Dev server exited with code ${code ?? 'unknown'}.`));
    });
  });
}
