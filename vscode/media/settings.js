const vscode = acquireVsCodeApi();
// console.log('editSettings', groupsList, colliderMatrix)

const groupsContainer = document.getElementById('groupsContainer')
const matrixContainer = document.getElementById('matrixContainer')
const length = colliderMatrix.length

const rowTitle = document.createElement('div')
rowTitle.className = 'rowItem'
const itemTitle = document.createElement('div')
itemTitle.innerHTML = '&nbsp;'
rowTitle.appendChild(itemTitle)
groupsList.forEach(g => {
  const item = document.createElement('div')
  item.innerHTML = g
  groupsContainer.appendChild(item)
  const itemTitle = document.createElement('div')
  itemTitle.innerHTML = g
  itemTitle.className = 'itemTitle'
  rowTitle.appendChild(itemTitle)
})
matrixContainer.appendChild(rowTitle)
const checkboxList = []
colliderMatrix.forEach((group, i) => {
  const row = document.createElement('div')
  row.className = 'rowItem'
  const nameDiv = document.createElement('div')
  nameDiv.innerHTML = groupsList[i]
  row.appendChild(nameDiv)
  checkboxList[i] = []
  for (let index = 0; index < length; index++) {
    const col = document.createElement('div')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = group[index]
    row.appendChild(col)
    col.appendChild(checkbox)
    checkboxList[i][index] = checkbox
    checkbox.addEventListener('change', (ev) => {
      // console.log('checked', ev.target.checked)
      colliderMatrix[i][index] = ev.target.checked
      colliderMatrix[index][i] = ev.target.checked
      checkboxList[i][index].checked = ev.target.checked
      checkboxList[index][i].checked = ev.target.checked
    })
  }
  matrixContainer.appendChild(row)
})

document.getElementById('save-btn').addEventListener('click', async () => {
  console.log(colliderMatrix);
  vscode.postMessage({
    command: 'saveSettings',
    colliderMatrix,
    groupsList,
  });
});
