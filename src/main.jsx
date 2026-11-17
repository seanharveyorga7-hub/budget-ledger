import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { isFirebaseConfigured } from './lib/firebase';
import App from './App';
import './styles.css';

function SetupRequired() {
  return (
    <div className="center-screen">
      <div className="card narrow">
        <div className="card-body stack">
          <h1 className="page-title">Firebase is not configured</h1>
          <p>
            Copy <code>.env.example</code> to <code>.env.local</code>, fill in your Firebase web app config, then restart{' '}
            <code>npm run dev</code>. See README.md for the full setup.
          </p>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>{isFirebaseConfigured ? <App /> : <SetupRequired />}</StrictMode>,
);
