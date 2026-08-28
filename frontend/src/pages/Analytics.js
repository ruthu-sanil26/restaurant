import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from './Analytics.module.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/orders/analytics');
        setData(res.data);
      } catch (err) {
        console.error('Analytics Fetch Error:', err);
        setError('Failed to load analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading Visual Analytics...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!data) {
    return <div className={styles.error}>No data available.</div>;
  }

  const {
    dailySales = [],
    hourlySales = [],
    orderSourceStats = {},
    popularReservationTimes = [],
    reservationStatusStats = {}
  } = data;

  // --- A. Top Level Metrics Calculations ---
  const totalRevenue = orderSourceStats.aiSales + orderSourceStats.manualSales;
  const totalOrders = orderSourceStats.aiOrdersCount + orderSourceStats.manualOrdersCount;
  const aiOrderShare = totalOrders > 0 ? ((orderSourceStats.aiOrdersCount / totalOrders) * 100).toFixed(1) : '0';
  const totalReservations = Object.values(reservationStatusStats).reduce((a, b) => a + b, 0);

  // --- B. Chart Definitions ---
  
  // 1. Daily Sales Chart
  const dailySalesData = {
    labels: dailySales.map(d => d.date),
    datasets: [
      {
        label: 'Sales (₹)',
        data: dailySales.map(d => d.sales),
        borderColor: '#7A6A56',
        backgroundColor: 'rgba(122, 106, 86, 0.1)',
        tension: 0.3,
        yAxisID: 'y',
        fill: true,
      },
      {
        label: 'Avg Order Value (AOV) (₹)',
        data: dailySales.map(d => d.aov),
        borderColor: '#C4AD97',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.3,
        yAxisID: 'y1',
      }
    ]
  };

  const dailySalesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#3D352E' } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#8E8276' } },
      y: {
        type: 'linear',
        position: 'left',
        grid: { color: 'rgba(61, 53, 46, 0.05)' },
        ticks: { color: '#8E8276' },
        title: { display: true, text: 'Sales Amount (₹)', color: '#3D352E' }
      },
      y1: {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: '#8E8276' },
        title: { display: true, text: 'AOV (₹)', color: '#3D352E' }
      }
    }
  };

  // 2. Order Channel Share
  const channelData = {
    labels: ['AI Assistant', 'Manual Browsing'],
    datasets: [
      {
        data: [orderSourceStats.aiOrdersCount, orderSourceStats.manualOrdersCount],
        backgroundColor: ['#7A6A56', '#C4AD97'],
        borderColor: ['#FAF7F2', '#FAF7F2'],
        borderWidth: 2,
      }
    ]
  };

  const channelOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#3D352E' } }
    }
  };

  // 3. Hourly Sales Distribution (Filter active hours e.g. 10:00 to 23:00)
  const activeHourlySales = hourlySales.filter(h => {
    const hr = parseInt(h.hour, 10);
    return hr >= 10 && hr <= 23;
  });

  const hourlySalesData = {
    labels: activeHourlySales.map(h => h.hour),
    datasets: [
      {
        label: 'Orders Count',
        data: activeHourlySales.map(h => h.count),
        backgroundColor: '#6E8870', // Sage Green
        borderRadius: 6,
      }
    ]
  };

  const hourlySalesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#8E8276' } },
      y: {
        grid: { color: 'rgba(61, 53, 46, 0.05)' },
        ticks: { precision: 0, color: '#8E8276' },
        title: { display: true, text: 'Orders Count', color: '#3D352E' }
      }
    }
  };

  // 4. Reservation Times
  const reservationTimesData = {
    labels: popularReservationTimes.map(r => r.time),
    datasets: [
      {
        label: 'Booked Tables',
        data: popularReservationTimes.map(r => r.count),
        backgroundColor: '#C26D6D', // Terracotta Red
        borderRadius: 6,
      }
    ]
  };

  const reservationTimesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#8E8276' } },
      y: {
        grid: { color: 'rgba(61, 53, 46, 0.05)' },
        ticks: { precision: 0, color: '#8E8276' },
        title: { display: true, text: 'Reservations Count', color: '#3D352E' }
      }
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Visual Analytics</h1>
      <p className={styles.subtitle}>Track sales performance, booking trends, and AI chatbot statistics.</p>

      {/* Stats Cards Strip */}
      <div className={styles.statsStrip}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Revenue</div>
          <div className={styles.statValue}>₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className={styles.statDesc}>Gross sales from all non-cancelled orders</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Orders</div>
          <div className={styles.statValue}>{totalOrders}</div>
          <div className={styles.statDesc}>Combined AI & manual order count</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>AI Assistant Share</div>
          <div className={styles.statValue}>{aiOrderShare}%</div>
          <div className={styles.statDesc}>Orders submitted via AI chatbot</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Table Bookings</div>
          <div className={styles.statValue}>{totalReservations}</div>
          <div className={styles.statDesc}>All reservation requests registered</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={styles.grid}>
        {/* Daily Sales */}
        <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
          <div className={styles.chartTitle}>
            Daily Revenue & AOV Trends <span>Last 30 Days</span>
          </div>
          <div className={styles.chartWrapper}>
            {dailySales.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                No sales data recorded yet.
              </div>
            ) : (
              <Line data={dailySalesData} options={dailySalesOptions} />
            )}
          </div>
        </div>

        {/* AI Share */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Ordering Channel Share <span>AI vs Manual</span></div>
          <div className={styles.chartWrapper}>
            {totalOrders === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                No orders recorded yet.
              </div>
            ) : (
              <Doughnut data={channelData} options={channelOptions} />
            )}
          </div>
        </div>

        {/* Hourly Volume */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Kitchen Volume by Hour <span>Active hours (10 AM - 11 PM)</span></div>
          <div className={styles.chartWrapper}>
            {activeHourlySales.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                No hourly activity recorded yet.
              </div>
            ) : (
              <Bar data={hourlySalesData} options={hourlySalesOptions} />
            )}
          </div>
        </div>

        {/* Peak Bookings */}
        <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
          <div className={styles.chartTitle}>Peak Reservation Hours <span>Customer booking distribution</span></div>
          <div className={styles.chartWrapper}>
            {popularReservationTimes.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                No reservation time data recorded yet.
              </div>
            ) : (
              <Bar data={reservationTimesData} options={reservationTimesOptions} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
