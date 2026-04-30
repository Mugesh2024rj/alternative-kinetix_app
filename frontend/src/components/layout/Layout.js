import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Toaster } from 'react-hot-toast';

const Layout = ({ children, title }) => (
  <div className="flex h-screen overflow-hidden bg-[#F3F4F6]">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title={title} />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
    <Toaster position="top-right" toastOptions={{
      style: { background: '#FFFFFF', color: '#111827', border: '1px solid #E5E7EB' },
      success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
      error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } }
    }} />
  </div>
);

export default Layout;
