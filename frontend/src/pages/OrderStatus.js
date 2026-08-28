import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api"; // API calls
import styles from "./Home.module.css";

function Home() {
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => {
    const fetchLastOrder = async () => {
      try {
        const res = await api.get("/public/orders/latest"); // replace with your endpoint
        setLastOrder(res.data);
      } catch (err) {
        console.error("Failed to fetch last order", err);
      }
    };
    fetchLastOrder();
  }, []);

  return (
    <div className={styles.homeContainer}>

      {/* Top bar */}
      <div className={styles.topBar}>
        <h2 className={styles.restaurantName}>🍴 Royal Rasoi</h2>
        <Link to="/login">
          <button className={styles.loginBtn}>Admin Login</button>
        </Link>
      </div>

      {/* Title */}
      <h1 className={styles.homeTitle}>Delicious Food, Delivered Fast</h1>
      <p className={styles.homeSubtitle}>
        Explore our menu, add items to your cart, and place your order online.
      </p>

      

      {/* Order Status Section */}
      {lastOrder && (
        <div className={styles.orderStatusHome}>
          <h2>Last Order Status</h2>
          <p>
            <strong>Order #{lastOrder._id.slice(-6)}</strong>
          </p>
          <p>Status: <span className={styles[`status_${lastOrder.status}`]}>{lastOrder.status}</span></p>
          <p>Total: ${lastOrder.totalAmount.toFixed(2)}</p>
          <p>Payment: {lastOrder.paymentStatus}</p>
        </div>
      )}

    </div>
  );
}

export default Home;