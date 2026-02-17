import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import './index.css';

import Login from './pages/Login.js';
import Dashboard from './pages/Dashboard.js';
import EmployeeManagement from './pages/EmployeeManagement.js';
import Attendance from './pages/Attendance.js';
import LeaveManagement from './pages/LeaveManagement.js';
import ProductCatalog from './pages/ProductCatalog.js';
import Categories from './pages/Categories.js';
import POSTerminal from './pages/POSTerminal.js';
import SalesHistory from './pages/SalesHistory.js';
import Analytics from './pages/Analytics.js';
import AdminSettings from './pages/AdminSettings.js';
import NoAccess from './pages/NoAccess.js';

const ProtectedRoute = ({ children, permission }: { children: React.ReactNode, permission?: string }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (permission && !user.permissions?.includes('all') && !user.permissions?.includes(permission)) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/no-access" element={<NoAccess />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/employees" element={
            <ProtectedRoute permission="employees">
              <Dashboard><EmployeeManagement /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute permission="attendance">
              <Dashboard><Attendance /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/leaves" element={
            <ProtectedRoute>
              <Dashboard><LeaveManagement /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/products" element={
            <ProtectedRoute permission="inventory">
              <Dashboard><ProductCatalog /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute permission="categories">
              <Dashboard><Categories /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/pos" element={
            <ProtectedRoute permission="pos">
              <Dashboard><POSTerminal /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/sales" element={
            <ProtectedRoute permission="sales">
              <Dashboard><SalesHistory /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute permission="analytics">
              <Dashboard><Analytics /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute permission="all">
              <Dashboard><AdminSettings /></Dashboard>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
