"use client";

import { useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminDashboard from '@/components/admin/AdminDashboard';
import PostEditor from '@/components/admin/PostEditor';
import { Toaster } from 'react-hot-toast';

export default function AdminBlog() {
  const { isAuthenticated, isMounted, login, logout } = useAdminAuth();
  const [view, setView] = useState('dashboard');
  const [editingPost, setEditingPost] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');

  if (!isMounted) return null;

  if (!isAuthenticated) {
    return <AdminLogin onLogin={login} />;
  }

  return (
    <div className="min-h-screen font-sans selection:bg-violet-500/30" style={{ background: '#0a0008' }}>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a0a2e',
            color: 'white',
            border: '1px solid rgba(124,58,237,0.3)',
            backdropFilter: 'blur(10px)',
          },
          success: {
            style: { borderLeft: '4px solid #10b981' }
          },
          error: {
            style: { borderLeft: '4px solid #ef4444' }
          }
        }}
      />
      
      <AdminNavbar
        currentView={view}
        onLogout={logout}
        autoSaveStatus={autoSaveStatus}
      />
      
      {view === 'dashboard' && (
        <AdminDashboard
          onCreateNew={() => {
            setEditingPost(null);
            setView('create');
          }}
          onEdit={(post) => {
            setEditingPost(post);
            setView('edit');
          }}
        />
      )}
      
      {(view === 'create' || view === 'edit') && (
        <PostEditor
          post={view === 'edit' ? editingPost : null}
          isEditing={view === 'edit'}
          onSave={() => setView('dashboard')}
          onCancel={() => setView('dashboard')}
          onAutoSave={(status) => setAutoSaveStatus(status)}
        />
      )}
    </div>
  );
}
