import { parse as ESParser } from '@typescript-eslint/typescript-estree';
import ESTraverse from "estraverse";
import { readFileSync } from 'fs';
import sizeOf from 'image-size';
import { get } from 'lodash-es';
import { join } from 'path';
import { CompletionItemKind, Position } from 'vscode';
import { GlobalData } from '../parser/global';
import { parseAssetsSrcFile } from './assets';

const parseOption = {
  comment: false,
  jsx: true,
  loc: true,
  // range: true,
};
const listNodeProps = ['x', 'y', 'angle', 'scaleX', 'scaleY',
  'rotation', 'anchorX', 'anchorY', 'skewX', 'skewY',
  'group', 'color', 'zIndex', 'active'];
const listCbs = [
  'onCollisionEnter',
  'onCollisionExit',
  'onCollisionStay',
  'onTouchStart',
  'onTouchMove',
  'onTouchEnd',
  'onTouchCancel',
];

export function parse(content = '') {
  return ESParser(content, parseOption) as any;
}

export function parseFile(filePath: string) {
  const code = readFileSync(filePath, 'utf-8');
  const ast = parse(code);
  return ast;
}

interface ASTPosition {
  line: number
  column: number
}

interface ASTLocation {
  start: ASTPosition
  end: ASTPosition
}

export function checkInRange(node, position: Position) {
  if (!node) { return false; }
  const { line, character } = position;
  const { start, end } = node.loc as ASTLocation;
  const { line: sl, column: sc } = start;
  const { line: el, column: ec } = end;
  const realLine = line + 1;
  if (realLine > sl && realLine < el) { return true; }
  if (realLine === sl || realLine === el) { return sc < character && ec > character; }
  return false;
}

export function getItems(content: string, position: Position) {
  // const filePath = fileURLToPath(uri);
  // const content = readFileSync(filePath, 'utf-8');
  // console.log('position', position);
  const ast = parse(content);
  // writeFileSync('./logs/parsed.json', JSON.stringify(ast, null, 2));
  let curTag;
  let curProp;
  let spineData;
  const data = {
    listProps: [],
    listMethods: [],
  };
  ESTraverse.traverse(ast, {
    enter: function (node: any, parent) {
      const { key, value } = node;
      switch (node.type) {
        case 'JSXOpeningElement':
          if (checkInRange(node, position)) {
            curTag = node.name.name;
            spineData = node.attributes.find(({ name }) => name.name === 'data');
          }
          break;
        case 'JSXAttribute':
          if (checkInRange(node, position)) {
            curProp = node.name.name;
          }
          break;
        case 'PropertyDefinition': {
          const { name } = key;
          data.listProps.push(name);
          break;
        }
        case 'MethodDefinition': {
          const { name } = key;
          data.listMethods.push(name);
          break;
        }
        default:
          break;
      }
    },
    fallback: 'iteration',
  });
  // console.log({ curTag, curProp });
  if (curTag === 'SpineSkeleton') {
    // console.log('spineData', spineData);
    const spineSkelName = get(spineData, 'value.expression.name');
    const listStringProps = [];
    const spineCache = GlobalData.spineAnimations[spineSkelName];
    if (curProp === 'animation' && spineCache) { listStringProps.push(...spineCache.animations); }
    if (curProp === 'skin' && spineCache) { listStringProps.push(...spineCache.skins); }
    return listStringProps.map(val => (
      {
        label: val,
        kind: CompletionItemKind.Value,
        insertText: val,
        // // insertTextFormat: InsertTextFormat.Snippet,
      }
    ));
  }
  return [];
}

export function getCenterOfParentNode(root: string, content: string, position: Position) {
  console.log('getCenterOfParentNode', GlobalData.designedResolution);
  const ast: any = parse(content);
  const { width, height } = GlobalData.designedResolution || { width: 1920, height: 1080 };
  const res: { tagName?: string, attributeNames: string[], newPropPos: any, newMethodPos: any, x: number, y: number } = { x: width * 0.5, y: height * 0.5 } as any;
  ESTraverse.traverse(ast, {
    enter: function (node: any, parent: any) {
      switch (node.type) {
        case 'ClassBody': {
          res.newPropPos = {
            character: 0,
            line: node.loc.start.line,
          };
          break;
        }
        case 'PropertyDefinition': {
          res.newPropPos = {
            character: 0,
            line: node.loc.start.line,
          };
          break;
        }
        case 'MethodDefinition': {
          // console.log('getCallbackName MethodDefinition', node);
          res.newMethodPos = {
            character: node.loc.start.column - 2,
            line: node.loc.start.line - 1,
          };
          break;
        }
        case 'JSXElement':
          if (parent && checkInRange(node.openingElement, position)) {
            const type = get(node, 'openingElement.name.name');
            res.tagName = type;
            res.attributeNames = get(node, 'openingElement.attributes', []).map(({ name }) => name.name);
            const frame = get(parent, 'openingElement.attributes', []).find(({ name }) => name.name === 'spriteFrame');
            // console.log('attributes', node.openingElement.attributes);
            if (!frame) { return; }
            const texture = frame.value.expression.name || frame.value.expression.property.name;
            // console.log('texture', texture);
            const textureAssetsList = parseAssetsSrcFile(join(root, 'src', 'assets', 'TextureAssets.ts'));
            const textureRelative = textureAssetsList.find(({ key }) => key === texture);
            // console.log('textureRelative', textureRelative);
            if (!textureRelative) { return; }
            const imagePath = join(root, 'res', textureRelative.value);
            const image = readFileSync(imagePath);
            const { width, height } = sizeOf(image);
            // console.log(width, height, imagePath);
            const packageJsonFile = join(root, 'package.json');
            const packageJson = readFileSync(packageJsonFile, 'utf-8');
            const isPixi = packageJson.includes('pixi');
            if (isPixi) {
              const frameChild = node.openingElement.attributes.find(({ name }) => name.name === 'spriteFrame');
              // console.log('frame', frame);
              const texture = frameChild.value.expression.name || frameChild.value.expression.property.name;
              const textureRelative = textureAssetsList.find(({ key }) => key === texture);
              const imagePath = join(root, 'res', textureRelative.value);
              const image = readFileSync(imagePath);
              const childTextureSize = sizeOf(image);
              res.x = width * 0.5 - childTextureSize.width * 0.5;
              res.y = height * 0.5 - childTextureSize.height * 0.5;
            } else {
              res.x = width * 0.5;
              res.y = height * 0.5;
            }
          }
          break;
        default:
          break;
      }
    },
    fallback: 'iteration',
  });
  return res;
}


export function getCallbackName(tagName: string) {
  switch (tagName) {
    case 'ButtonComp': {
      // console.log('getCallbackName MethodDefinition', node);
      return [{
        name: 'onPress',
        params: `target: ButtonComp`,
      }];
    }
    case 'TouchEventRegister': {
      const params = 'touch: Touch';
      return ['onTouchEnd', 'onTouchStart', 'onTouchEnd', 'onTouchCancel'].map(name => ({
        name,
        params,
      }));
    }
    case 'RigidBody': {
      const params = 'other: RigidBody';
      return ['onBeginContact', 'onEndContact', 'onPreSolve', 'onPostSolve'].map(name => ({
        name,
        params,
      }));
    }
    case 'Collider':
    case 'BoxCollider':
    case 'CircleCollider':
    case 'PolygonCollider':
      {
        const params = 'other: Collider';
        return ['onCollisionEnter', 'onCollisionExit', 'onCollisionStay'].map(name => ({
          name,
          params,
        }));
      }
    default:
      return [];
  }
}
