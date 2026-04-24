import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Toaster } from 'react-hot-toast';

const Layout = ({ children, title }) => (
  <div className="flex h-screen overflow-hidden bg-dark-900">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title={title} />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
    <Toaster position="top-right" toastOptions={{
      style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
      success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
      error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
    }} />
  </div>
);

export default Layout;
