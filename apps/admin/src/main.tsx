import { QueryClientProvider } from '@tanstack/react-query';
import { configureClient } from '@repo/admin-sdk';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './index.css';
import { queryClient } from './lib/query-client';

// SDK uses its own axios instance — separate from `lib/api.ts` because the
// SDK declares the full server envelope in its types, while `lib/api.ts`
// auto-unwraps. The two can coexist while features migrate one at a time.
configureClient({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
