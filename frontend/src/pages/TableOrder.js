import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../services/api";
import styles from "./TableOrder.module.css";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "";

export default function TableOrder() {
  const { tableId } = useParams();

  const [table, setTable] = useState(null);
  const [menu, setMenu] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [aiOpen, setAiOpen] = useState(false);

  const socketRef = useRef(null);

  /* ---------------- FETCH TABLE + MENU ---------------- */

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tableRes, menuRes] = await Promise.all([
          api.get(`/public/tables/${tableId}`),
          api.get("/public/menu"),
        ]);

        setTable(tableRes.data);
        setMenu(menuRes.data);
      } catch (err) {
        setError("Table not found or menu unavailable.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tableId]);

  /* ---------------- SOCKET ORDER UPDATE ---------------- */

  useEffect(() => {
    if (!order?._id) return;

    const socket = io(SOCKET_URL || window.location.origin, {
      path: "/socket.io",
    });

    socketRef.current = socket;

    socket.emit("joinOrder", order._id);

    socket.on("orderUpdate", (updatedOrder) => {
      setOrder(updatedOrder);
    });

    return () => {
      socket.off("orderUpdate");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [order]);

  /* ---------------- PLACE ORDER ---------------- */

  const placeOrder = async (item) => {
    setPlacing(true);
    setError("");

    try {
      const res = await api.post("/public/orders", {
        table: table?._id, // ✅ FIXED (must be MongoDB ID)
        items: [
          {
            menuItem: item._id,
            quantity: 1,
          },
        ],
      });

      setOrder(res.data);
    } catch (err) {
      console.error("Order Error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return <div className={styles.loading}>Loading menu...</div>;
  }

  if (error && !table) {
    return <div className={styles.error}>{error}</div>;
  }

  /* ---------------- UI ---------------- */

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          Order for Table {table?.number}
        </h1>
      </header>

      {error && <div className={styles.bannerError}>{error}</div>}

      {/* MENU */}
      <div className={styles.menuSection}>
        <h2>Menu</h2>

        {menu.map((category) => (
          <div key={category._id} className={styles.category}>
            <h3>{category.name}</h3>

            <div className={styles.itemGrid}>
              {(category.items || []).map((item) => (
                <div key={item._id} className={styles.itemCard}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>
                      {item.name}
                    </span>

                    <span className={styles.itemPrice}>
                      ₹{item.price}
                    </span>
                  </div>

                  {item.description && (
                    <p className={styles.itemDesc}>
                      {item.description}
                    </p>
                  )}

                  <button
                    className={styles.addBtn}
                    onClick={() => placeOrder(item)}
                    disabled={placing}
                  >
                    {placing ? "Placing..." : "Order Now"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ORDER CONFIRMATION */}
        {order && (
          <div className={styles.confirmation}>
            <p>✅ Order #{order._id.slice(-6)} placed!</p>
            <p>Total: ₹{order.totalAmount}</p>
          </div>
        )}
      </div>
    </div>
  );
}