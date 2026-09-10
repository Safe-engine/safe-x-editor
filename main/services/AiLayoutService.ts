import { clipboard } from 'electron';
import { execFile } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, extname, join, relative, resolve, sep } from 'path';
import { tmpdir } from 'os';
import { getResolutionSettings } from '../helper/settings';
import { parseAssetsSrcFile } from './assets';

function runAgy(prompt: string, cwd: string) {
  return new Promise<string>((resolvePromise, reject) => {
    execFile('agy', ['--dangerously-skip-permissions', '--mode', 'accept-edits', '--effort', 'low', '--print-timeout', '2m', '-p', prompt], { cwd, timeout: 2 * 60 * 1000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error);
      else resolvePromise(stdout);
    });
  });
}

function resolveTargetFile(rootFolder: string, filePath: string) {
  const sourceFolder = resolve(rootFolder, 'src');
  const target = resolve(filePath);
  const targetRelative = relative(sourceFolder, target);
  const isSceneOrComponent = targetRelative.startsWith(`scene${sep}`) || targetRelative.startsWith(`components${sep}`);
  if (!isSceneOrComponent || targetRelative.startsWith('..') || extname(target) !== '.tsx' || !existsSync(target)) {
    throw Error('AI generation is only available for existing scene and component files.');
  }
  return target;
}

function clipboardReferenceImage() {
  const image = clipboard.readImage();
  if (image.isEmpty()) throw Error('The clipboard does not contain an image.');
  const directory = resolve(tmpdir(), 'safe-x-editor', 'ai-layout-references');
  mkdirSync(directory, { recursive: true });
  const imagePath = resolve(directory, `clipboard-${Date.now()}.png`);
  writeFileSync(imagePath, image.toPNG());
  return imagePath;
}

function layoutContext(rootFolder: string, target: string) {
  const source = readFileSync(target, 'utf-8');
  const spriteFrameKeys = Array.from(source.matchAll(/\bspriteFrame\s*=\s*{\s*([A-Za-z_$][\w$]*)\s*}/g), (match) => match[1]);
  const uniqueKeys = Array.from(new Set(spriteFrameKeys));
  const assetsFolder = join(rootFolder, 'src', 'assets');
  const assets = ['TextureAssets.ts', 'SpriteFrames.ts']
    .flatMap((fileName) => parseAssetsSrcFile(join(assetsFolder, fileName)));
  const assetByKey = new Map(assets.map((asset: any) => [asset.key, asset]));
  const resolution = getResolutionSettings(rootFolder) || { width: 1920, height: 1080 };
  const imageDetails = uniqueKeys.map((key) => {
    const asset: any = assetByKey.get(key);
    const width = Number(asset?.size?.width) || 0;
    const height = Number(asset?.size?.height) || 0;
    return `  - ${key}: ${width && height ? `${width} × ${height}px` : 'size unavailable'}${asset?.path ? ` (${asset.path})` : ''}`;
  });

  return [
    'Layout context — use these dimensions and coordinate system:',
    `- File name: ${basename(target)}`,
    `- Designed screen size: ${resolution.width} × ${resolution.height}px`,
    imageDetails.length ? '- Image assets used in this scene/component:' : '- No direct spriteFrame image assets were found.',
    ...imageDetails,
  ].join('\n');
}

export async function generateLayoutWithAi({ rootFolder, filePath, prompt, referenceImagePath, useClipboardReference }: {
  rootFolder: string;
  filePath: string;
  prompt: string;
  referenceImagePath?: string;
  useClipboardReference?: boolean;
}) {
  if (!rootFolder) throw Error('No project is loaded.');
  if (!prompt?.trim()) throw Error('Enter a prompt.');
  const target = resolveTargetFile(rootFolder, filePath);
  const referencePath = useClipboardReference ? clipboardReferenceImage() : referenceImagePath;
  if (referencePath && !existsSync(referencePath)) throw Error('The reference image no longer exists.');
  const context = layoutContext(rootFolder, target);

  const instruction = [
    `Edit only the selected SafeX ${target.includes(`${sep}scene${sep}`) ? 'scene' : 'component'} file: ${target}.`,
    'Rearrange its existing UI nodes into a coherent, visually balanced screen. Preserve the project\'s existing SafeX/SDL coding conventions and only make changes needed for the requested layout.',
    context,
    referencePath && `Use this reference image as visual guidance: ${referencePath}`,
    `User request: ${prompt.trim()}`,
    'Apply the changes directly to that file. Do not modify any other files. Do not return code or explanations; finish after saving the file.',
  ].filter(Boolean).join('\n');

  try {
    await runAgy(instruction, rootFolder);
    return { success: true };
  } catch (error: any) {
    if (error?.code === 'ENOENT') throw Error('The agy CLI was not found. Install and sign in to agy before generating a layout.');
    throw Error(error?.message || 'AI layout generation failed.');
  }
}
