import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [stats, setStats] = useState({
    orders: 0,
    tables: 0,
    menuItems: 0,
    pendingOrders: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      // ✅ ONLY DATABASE CALLS
      const [ordersRes, tablesRes, menuRes] = await Promise.all([
        api.get('/orders'),
        api.get('/tables'),
        api.get('/menu'),
      ]);

      const allOrders = Array.isArray(ordersRes.data) ? ordersRes.data : [];

      // ✅ Sort latest first
      const sorted = allOrders.sort(
        (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
      );

      // ✅ Pending orders count
      const pendingCount = sorted.filter(o =>
        ['pending', 'confirmed', 'preparing'].includes(o.status?.toLowerCase())
      ).length;

      // ✅ Set stats
      setStats({
        orders: sorted.length,
        tables: tablesRes.data?.length || 0,
        menuItems: menuRes.data?.length || 0,
        pendingOrders: pendingCount,
      });

      // ✅ Latest 10 orders
      setRecentOrders(sorted.slice(0, 10));

    } catch (err) {
      console.error('Dashboard Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // 🔄 Auto-refresh every 10 sec
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading Dashboard...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.pageTitle}>Dashboard</h1>

      {/* ✅ STATS */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.pendingOrders}</div>
          <div className={styles.statLabel}>Pending Orders</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.orders}</div>
          <div className={styles.statLabel}>Total Orders</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.tables}</div>
          <div className={styles.statLabel}>Tables</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.menuItems}</div>
          <div className={styles.statLabel}>Menu Items</div>
        </div>
      </div>

      {/* ✅ RECENT ORDERS */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Orders</h2>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Table</th>
                <th>Items</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>

            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="3">No orders found.</td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      {order.table?.number || order.table || 'N/A'}
                    </td>

                    <td>
                      {order.itemNames || order.items?.map(i => i.name || i.menuItem?.name).join(', ') || 'No Items'}
                    </td>

                    <td>
                      <span
                        className={`${styles.statusLabel} ${
                          styles[`status_${order.status?.toLowerCase()}`]
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td>
                      ₹{Number(order.totalAmount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>
      </section>
    </div>
  );
}