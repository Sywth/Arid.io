import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SocketProvider } from './hooks/Socket.tsx';
import { GameProvider } from './hooks/LocalGameState.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <SocketProvider>
    <GameProvider>
      <App />
    </GameProvider>
  </SocketProvider>,
  // </React.StrictMode>,
);
