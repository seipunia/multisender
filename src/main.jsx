import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

//wallet provider
import { WalletConnectProvider } from './components/walletConnect.jsx'
//toater
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletConnectProvider >
      <App />
      <Toaster
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                    style: {
                        border: "1px solid orange",
                        // color: "black",
                        // background: "bg-gray-800",
                    },
                }}
            />
    </WalletConnectProvider>
  </React.StrictMode>,
)
