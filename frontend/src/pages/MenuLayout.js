import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import styles from "./MenuLayout.module.css";

function MenuLayout() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await api.get("/tables");
        setTables(res.data);
      } catch (err) {
        console.error("Failed to fetch tables", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, []);

  return (
    <div className={styles.menuContainer}>
      <h1 className={styles.menuTitle}>Select Your Table</h1>

      {loading ? (
        <p>Loading tables...</p>
      ) : (
        <div className={styles.qrGrid}>
          {tables.map((table) => (
          <div
            key={table._id}
            className={`${styles.qrCard} ${
              table.status === 'available'
                ? styles.availableCard
                : table.status === 'reserved'
                ? styles.reservedCard
                : styles.occupiedCard
            }`}
          >
            <div className={styles.tableHeader}>
              <h2>Table {table.number}</h2>
              <div
                className={`${styles.statusDot} ${
                  table.status === 'available'
                    ? styles.available
                    : table.status === 'reserved'
                    ? styles.reserved
                    : styles.occupied
                }`}
                title={`Status: ${table.status}`}
              ></div>
            </div>
            <p className={styles.statusText}>
              {table.status === 'available' ? 'Available' : table.status === 'reserved' ? '🔒 Reserved' : 'Occupied'}
            </p>
            {table.status === 'available' ? (
              <Link to={`/ordermenu/${table.number}`}>
                <button>Open Menu</button>
              </Link>
            ) : table.status === 'reserved' ? (
              <button disabled className={styles.reservedBtn}>
                🗓️ Table Reserved
              </button>
            ) : (
              <button disabled className={styles.disabledBtn}>
                Table Occupied
              </button>
            )}
          </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MenuLayout;