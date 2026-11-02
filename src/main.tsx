import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { installRadixPointerGuard } from './lib/radix-pointer-guard'
import './index.css'

installRadixPointerGuard();

createRoot(document.getElementById("root")!).render(<App />);
