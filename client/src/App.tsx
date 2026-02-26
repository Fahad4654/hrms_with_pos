import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './index.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeManagement from './pages/EmployeeManagement';
import Attendance from './pages/Attendance';
import LeaveManagement from './pages/LeaveManagement';
import LeaveApprovals from './pages/LeaveApprovals';
import SystemConfig from './pages/SystemConfig';
import ProductCatalog from './pages/ProductCatalog';
import Categories from './pages/Categories';
import Companies from './pages/Companies';
import POSTerminal from './pages/POSTerminal';
import SalesHistory from './pages/SalesHistory';
import Analytics from './pages/Analytics';
import AdminSettings from './pages/AdminSettings';
import NoAccess from './pages/NoAccess';
import UserProfile from './pages/UserProfile';

const ProtectedRoute = ({ children, permission }: { children: React.ReactNode, permission?: string }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (permission && !user.permissions?.includes('all') && !user.permissions?.includes(permission)) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

const DynamicLanding = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  const routes = [
    { to: "/employees", permission: "employees" },
    { to: "/attendance", permission: "attendance" },
    { to: "/leaves", permission: "leaves" },
    { to: "/leave-approvals", permission: "leave-approvals" },
    { to: "/categories", permission: "categories" },
    { to: "/companies", permission: "inventory" },
    { to: "/products", permission: "inventory" },
    { to: "/pos", permission: "pos" },
    { to: "/sales", permission: "sales" },
    { to: "/dashboard", permission: "dashboard" },
    { to: "/permissions", permission: "all" },
    { to: "/system-config", permission: "all" },
    { to: "/profile", permission: null }
  ];

  const firstAccessible = routes.find(r => 
    !r.permission || 
    user.permissions?.includes('all') || 
    user.permissions?.includes(r.permission)
  );

  return <Navigate to={firstAccessible?.to || "/profile"} replace />;
};

const App: React.FC = () => {
  return (
    <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/no-access" element={<NoAccess />} />
          <Route path="/" element={
            <ProtectedRoute>
              <DynamicLanding />
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
            <ProtectedRoute permission="leaves">
              <Dashboard><LeaveManagement /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/leave-approvals" element={
            <ProtectedRoute permission="leave-approvals">
              <Dashboard><LeaveApprovals /></Dashboard>
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
          <Route path="/companies" element={
            <ProtectedRoute permission="inventory">
              <Dashboard><Companies /></Dashboard>
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
          <Route path="/dashboard" element={
            <ProtectedRoute permission="dashboard">
              <Dashboard><Analytics /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/permissions" element={
            <ProtectedRoute permission="all">
              <Dashboard><AdminSettings /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/system-config" element={
            <ProtectedRoute permission="all">
              <Dashboard><SystemConfig /></Dashboard>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
  );
};

export default App;
