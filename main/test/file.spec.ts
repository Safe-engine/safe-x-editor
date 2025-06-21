import { loadComponent } from '@@/services/ComponentService';
import path from 'path';

// require('chai/register-should');
const file = path.join(__dirname, '../../../../axmol/googselement/src/components/UpgradeDialog.tsx');
const folder = path.join(__dirname, `../../gen`);
const componentDir = path.join(__dirname, '../../../../axmol/googselement/src/components');
/*
describe('getFilesInFolder', () => {
  it('valid data', async () => {
    const result = await getFilesInFolder({
      src: folder,
      excludes: defaultExclude
    });
    console.log(result);
  });
});
*/
async function start() {
  const result = await loadComponent({ path: file });
  console.log(result.treeData);
  console.log(result.treeData.children[6]);
  // updateComponentPropTypes({ propsData: result.propTypes, filePath: file })
}
start()
// getClassesMetaData(componentDir)
/*
const deleteFile = (name: string) => {
  const file = path.join(folder, `${name}.ts`);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log('deleted file', file);
  }
};

describe('createAction', () => {
  before(() => {
    deleteFile('constants');
    deleteFile('actions');
    deleteFile('logic');
    deleteFile('reducer');
    deleteFile('selectors');
  });
  it('success', async () => {
    const result = await createAction({
      path: folder,
      name: 'test',
      params: 'x, y',
      // isUseLogic: true,
      filesPath: {},
    });
    console.log(result);
  });
  it('update file', async () => {
    const result = await createAction({
      path: folder,
      name: 'genComponent',
      params: 'nodesData',
      isUseLogic: true,
      filesPath: {},
    });
    console.log(result);
  });
});

describe('updateComponentTag', () => {
  it('valid data', async () => {
    const nodesData = {
      tag: 'div',
      name: 'block',
      props: { data: 'name' },
      items: [
        {
          tag: 'span',
          name: 'vic',
          props: { data: 'oxy' },
          effect: 'active',
          styles: 'color:blue;',
          items: [
            { title: 'ab text c' },
            {
              tag: 'h1', name: 'asxc', props: { rets: 'oxy' },
              items: [{ title: 'a4tyb text c' }, { title: 'l23af' }],
            },
          ],
        },
      ],
    };
    const result = await updateComponentTag({ nodesData, filePath: file, styleType: 'tailwind' });
    // console.log(treeData);
    // result.should.to.have.property('name');
  });
});
*/