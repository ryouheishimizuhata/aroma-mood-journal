import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { useRegisterSW } from 'virtual:pwa-register/react'

function SWUpdater() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  return needRefresh ? (
    <div style={{position:'fixed',bottom:16,left:16,right:16,padding:12,background:'#111827',color:'#fff',borderRadius:12}}>
      新しいバージョンがあります。
      <button onClick={() => updateServiceWorker(true)} style={{marginLeft:12,padding:'6px 12px'}}>更新</button>
    </div>
  ) : null
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SWUpdater />
    <App />
  </React.StrictMode>
)
