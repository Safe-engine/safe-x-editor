import { camelCase, upperFirst } from "lodash";
import { renderMustacheFile } from "../helper/string.util";
import { createSetter } from "../helper/utils";
import { collidersCompList, noRenderList } from "../utils/constants";
import { parseValue } from "./ast";
import { GlobalData } from "./global";

function isNoRender(name) {
  return [...GlobalData.customNoRenderComponents, ...noRenderList].includes(name);
}

const nameCount = {}
function getComponentName(name: string) {
  if (!nameCount[name])
    nameCount[name] = 0
  return `${camelCase(name)}Comp${++nameCount[name]}`
}

function parseAttribute(value, componentVar, prop) {
  if (value.type === 'JSXExpressionContainer' && value.expression.type === 'ObjectExpression') {
    const { properties } = value.expression
    return properties.map(p => {
      return `\n${componentVar}->${prop}->${createSetter(p.key.name, parseValue(p.value))};`
    }).join('')
  }
  return `\n${componentVar}->${createSetter(prop, parseValue(value))};`
}

function attributesToParams(componentName, attributes) {
  const template = GlobalData.templatesMap[componentName]
  if (!template) { return '' }
  const props = { ...GlobalData.componentsMap[componentName] }
  // console.log(GlobalData.defaultPropsMap)
  attributes.map(({ name, value }) => {
    const attName = name.name
    if (attName === 'node') return
    props[attName] = parseValue(value)
  })
  // if (componentName === 'SpineSkeleton') {
  //   props.atlas = props.data.replace('SpineAssets', 'SpineAtlas')
  // }
  return renderMustacheFile(template, props)
}

export function praseJSXElement(jsx) {
  const { openingElement, children } = jsx
  const { attributes, name: rootTag } = openingElement
  let ret = ''
  let refs = '';
  const classVar = getComponentName(GlobalData.currentClassName)
  function parseJSX(tagName, children, attributes, parentVar?) {
    // console.log('parseJSX', tagName)
    const componentName = tagName.name
    if ('RigidBody' === componentName) return;
    const compVar = getComponentName(componentName)
    const isCollideComp = collidersCompList.includes(componentName)
    const getComVar = isCollideComp ? `${compVar}.get()` : compVar;
    if (!parentVar) {
      refs += `\nauto ${classVar} = ${compVar}->addComponent<${GlobalData.currentClassName}>();`
    }
    const params = attributesToParams(componentName, attributes)
    if (isNoRender(componentName)) {
      if (isCollideComp) {
        const colliderParams = attributesToParams('Collider', attributes)
        ret += `\n${parentVar}->addComponent<Collider>(${colliderParams});`
      }
      ret += `\nauto ${compVar} = ${parentVar}->addComponent<${componentName}>(${params});`
    } else {
      ret += `\nauto ${compVar} = ${componentName}::create(${params});`
    }
    attributes.forEach(({ name, value }) => {
      const attName = name.name
      if (attName === '$ref') {
        const refString = value.value
        // console.log(refString);
        if (refString.includes(':')) {
          const [refVal, compName] = refString.split(':')
          refs += `\n${classVar}->${refVal} = ${compVar}->getComponent<${compName}>();`
        } else {
          refs += `\n${classVar}->set${upperFirst(refString)}(${compVar});`
        }
      } else if (attName.includes('$')) {
        const cbName = attName.replace('$', '')
        // const [obj, method] = value.value.split('.')
        const cbParamNum = GlobalData.cbParamsMap[cbName] || 1
        if (attName === '$node') {
          refs += `\n${classVar}->${value.value} = ${getComVar}->${cbName};`
        } else if (value.value.includes('.')) {
          const [obj, method] = value.value.split('.')
          const cbStr = `AX_CALLBACK_${cbParamNum}(${upperFirst(obj)}::${method}, ${classVar}->${obj}.get())`
          refs += `\n${getComVar}->set${upperFirst(cbName)}(${cbStr});`
        } else {
          const cbStr = `AX_CALLBACK_${cbParamNum}(${GlobalData.currentClassName}::${value.value}, ${classVar}.get())`
          refs += `\n${getComVar}->set${upperFirst(cbName)}(${cbStr});`
        }
      } else if (attName === 'node') {
        ret += parseAttribute(value, getComVar, attName)
      } else {
        const template = GlobalData.templatesMap[componentName]
        // console.log(componentName)
        if (template.indexOf(attName) === -1) {
          ret += `\n${getComVar}->set${upperFirst(attName)}(${parseValue(value)});`
        }
      }
    })
    if (parentVar && !isNoRender(componentName)) {
      ret += `\n${parentVar}->node->addChild(${compVar}->node);`
    }
    children.forEach(element => {
      const { openingElement, children, type } = element
      if (type !== 'JSXElement') return;
      const { attributes, name } = openingElement
      parseJSX(name, children, attributes, compVar)
    })
  }
  parseJSX(rootTag, children, attributes)
  ret += `${refs}\nreturn ${classVar};`
  // console.log(GlobalData.currentClassName, ret.length)
  return ret.replace('\n', '')
}
