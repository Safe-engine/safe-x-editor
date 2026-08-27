import { clipboard } from 'electron';
import { execFile } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, relative, resolve, sep } from 'path';
import { tmpdir } from 'os';

function runAgy(prompt: string, cwd: string) {
  return new Promise<string>((resolvePromise, reject) => {
    execFile('agy', ['--dangerously-skip-permissions', '--mode', 'accept-edits', '-p', prompt], { cwd, timeout: 10 * 60 * 1000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
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

  const instruction = [
    `Edit only the selected SafeX ${target.includes(`${sep}scene${sep}`) ? 'scene' : 'component'} file: ${target}.`,
    'Rearrange its existing UI nodes into a coherent, visually balanced screen. Preserve the project\'s existing SafeX/SDL coding conventions and only make changes needed for the requested layout.',
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
