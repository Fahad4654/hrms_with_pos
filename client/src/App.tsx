import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import './index.css';

import Login from './pages/Login.js';
import Dashboard from './pages/Dashboard.js';
import EmployeeManagement from './pages/EmployeeManagement.js';
import Attendance from './pages/Attendance.js';
import ProductCatalog from './pages/ProductCatalog.js';
import POSTerminal from './pages/POSTerminal.js';
import Analytics from './pages/Analytics.js';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/employees" element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
              <Dashboard><EmployeeManagement /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute>
              <Dashboard><Attendance /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/products" element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
              <Dashboard><ProductCatalog /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/pos" element={
            <ProtectedRoute>
              <Dashboard><POSTerminal /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
              <Dashboard><Analytics /></Dashboard>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
