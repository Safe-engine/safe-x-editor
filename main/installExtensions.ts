import { installExtension, REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

export async function installDevtoolExtensions() {
  // eslint-disable-next-line global-require
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = [REACT_DEVELOPER_TOOLS];

  return Promise.all(
    extensions.map(
      name => installExtension(name, { forceDownload })
    )
  ).catch(console.log);
}
