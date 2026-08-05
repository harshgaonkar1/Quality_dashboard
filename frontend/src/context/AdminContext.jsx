// ============================================================
// Admin Context
// ------------------------------------------------------------
// Manages global Admin mode state, password verification modal,
// and localStorage persistence.
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('admin_mode_active') === 'true';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      document.documentElement.classList.add('admin-mode');
    } else {
      document.documentElement.classList.remove('admin-mode');
    }
  }, [isAdmin]);

  const openAdminModal = () => {
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const closeAdminModal = () => {
    setErrorMsg('');
    setIsModalOpen(false);
  };

  const loginAdmin = async (password) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await api.post('/admin/verify-password', { password });
      if (response.data?.success || response.success) {
        setIsAdmin(true);
        localStorage.setItem('admin_mode_active', 'true');
        localStorage.setItem('admin_password', password);
        closeAdminModal();
        return true;
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Incorrect password';
      setErrorMsg(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
    localStorage.removeItem('admin_mode_active');
    localStorage.removeItem('admin_password');
  };

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isModalOpen,
        openAdminModal,
        closeAdminModal,
        loginAdmin,
        logoutAdmin,
        errorMsg,
        loading,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
