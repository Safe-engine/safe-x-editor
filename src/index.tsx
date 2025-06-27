import { createRoot } from 'react-dom/client';
import '../node_modules/allotment/dist/style.css';
import { App } from './app/App';
import { AppProvider } from './states/app.provider';

const container = document.getElementById('app')
const root = createRoot(container)
root.render(<AppProvider>
  <App />
</AppProvider>)
