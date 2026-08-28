import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';

import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import Tables from './pages/Tables';
import Settings from './pages/Settings';
import Staff from './pages/Staff';

import Home from './pages/Home';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderStatus from './pages/OrderStatus';
import Contact from "./pages/Contact";

import MenuLayout from "./pages/MenuLayout";
import OrderMenu from "./pages/OrderMenu";
import Bill from "./pages/Bill";
import ReserveTable from "./pages/ReserveTable";
import Reservations from "./pages/Reservations";


function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>

      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-status" element={<OrderStatus />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/bill" element={<Bill />} />
      <Route path="/reserve" element={<ReserveTable />} />
      

      {/* Table Selection Page */}
      <Route path="/menulayout" element={<MenuLayout />} />

      {/* Menu Page for each table */}
      <Route path="/ordermenu/:tableId" element={<OrderMenu />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="menu" element={<Menu />} />
        <Route path="orders" element={<Orders />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="tables" element={<Tables />} />
        <Route path="staff" element={<Staff />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}

export default App;