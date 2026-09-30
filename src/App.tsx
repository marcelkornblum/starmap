import type React from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './App.css';

export interface AppProps {}

export const App: React.FC<AppProps> = () => {
  return <RouterProvider router={router} />;
};

export default App;
