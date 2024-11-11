import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { AppProvider } from 'states/app.provider';
import '../node_modules/devextreme/dist/css/dx.light.css';
import '../node_modules/allotment/dist/style.css';
const container = document.getElementById('app')
const root = createRoot(container)
root.render(<AppProvider>
  <App />
</AppProvider>)
