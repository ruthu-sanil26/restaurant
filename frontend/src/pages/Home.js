import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import styles from "./Home.module.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import menuImage from "../assets/home.jpeg";
import baked from "../assets/chicken.jpg";
import aboutFoodImg from "../assets/imagee.jpeg";

function Home() {
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    const checkActiveOrder = async () => {
      try {
        const storedBill = localStorage.getItem("bill");
        if (storedBill) {
          const parsed = JSON.parse(storedBill);
          if (parsed && parsed._id) {
            const res = await api.get(`/public/orders/${parsed._id}`);
            if (res.data && !['completed', 'cancelled', 'served'].includes(res.data.status)) {
              setActiveOrder(res.data);
            } else {
              // Order is finished, we don't necessarily wipe the bill but we don't track it prominently
              setActiveOrder(null);
            }
          }
        }
      } catch (err) {
        console.error("No active order tracked:", err);
      }
    };
    checkActiveOrder();
    
    // Poll every 10 seconds for real-time tracking on homepage
    const interval = setInterval(checkActiveOrder, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Header />

      {/* Active Order Banner */}
      {activeOrder && (
        <div style={{
          background: 'linear-gradient(90deg, var(--accent) 0%, #ff7043 100%)',
          padding: '12px 5%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#111',
          fontWeight: '700',
          boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>🕒</span>
            <div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Table {activeOrder.table?.number} • Tracker</div>
              <div style={{ fontSize: '1.1rem' }}>Order Status: {activeOrder.status.toUpperCase()}</div>
            </div>
          </div>
          <Link to="/bill" style={{
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.2)',
            padding: '8px 16px',
            borderRadius: '8px',
            color: '#111',
            textDecoration: 'none',
            fontSize: '0.9rem'
          }}>
            View Bill &rarr;
          </Link>
        </div>
      )}

      {/* Hero */}
      <div className={styles.heroImageContainer}>
        <img src={menuImage} alt="Food Banner" className={styles.heroImage} />
        <div className={styles.heroOverlay}>
          <h1 className={styles.heroOverlayTitle}>Experience the Future of Dining</h1>
          <p className={styles.heroOverlaySubtitle}>Fast, personalized, and AI-driven.</p>
          <Link to="/menulayout" className={styles.heroOverlayBtn}>Order Now</Link>
        </div>
      </div>

      {/* How It Works */}
      <div className={styles.howItWorksSection}>
        <h2 className={styles.howItWorksTitle}>Experience the Future of Dining</h2>
        <p className={styles.howItWorksSubtitle}>How our AI Assistant works for you</p>
        <div className={styles.stepsContainer}>
          <div className={styles.stepCard}>
            <div className={styles.stepIconWrapper}>
              <span className={styles.stepIcon}>🤖</span>
            </div>
            <h3>1. Sit &amp; Chat</h3>
            <p>Talk to our smart AI waiter, order from phone, and experience seamless service.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepIconWrapper}>
              <span className={styles.stepIcon}>✨</span>
            </div>
            <h3>2. Get Recommendations</h3>
            <p>Unsure what to eat? Get dish recommendations just for you.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepIconWrapper}>
              <span className={styles.stepIcon}>🍽️</span>
            </div>
            <h3>3. Enjoy Your Meal</h3>
            <p>Fast, direct-to-kitchen ordering ensures lightning-fast preparation and delivery.</p>
          </div>
        </div>
      </div>

      {/* Special Dishes */}
      <div className={styles.specialSection}>
        <h2 className={styles.specialTitle}>Our Special Dishes</h2>
        <p className={styles.specialSubtitle}>Taste the most loved dishes from our restaurant</p>
        <div className={styles.dishGrid}>
          <div className={styles.dishCard}>
            <img src="https://images.unsplash.com/photo-1600891964599-f61ba0e24092" alt="BBQ Chicken" />
            <h3>BBQ Chicken</h3>
            <p>Grilled BBQ chicken with rich smoky flavor.</p>
          </div>
          <div className={styles.dishCard}>
            <img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38" alt="Cheese Pizza" />
            <h3>Cheese Pizza</h3>
            <p>Delicious pizza topped with melted cheese and fresh herbs.</p>
          </div>
          <div className={styles.dishCard}>
            <img src={baked} alt="Baked Chicken" />
            <h3>Baked Chicken</h3>
            <p>Oven baked chicken with tasty seasoning.</p>
          </div>
        </div>
      </div>

      {/* About Split Section */}
      <div className={styles.aboutSplitSection}>
        <div className={styles.aboutImagePart}>
          <img src={aboutFoodImg} alt="Vibrant Restaurant Food" />
        </div>
        <div className={styles.aboutTextPart}>
          <h2 className={styles.splitSectionTitle}>Where Taste <br /> Meets Perfection.</h2> 
          <div className={styles.splitFeature}>
            <span className={styles.featureIcon}>✨</span>
            <p className={styles.featureText}>
              Welcome to Royal Rasoi, where traditional taste meets modern ideas. We serve fresh, tasty food made with quality ingredients and prepared with care by our chefs.

            </p>
          </div>
          <div className={styles.splitFeature}>
            <span className={styles.featureIcon}>📖</span>
            <p className={styles.featureText}>
              We started with a simple idea: to bring traditional flavors into a modern space and give you a dining experience that’s more than just food.

            </p>
          </div>
          <div className={styles.splitFeature}>
            <span className={styles.featureIcon}>🤖</span>
            <p className={styles.featureText}>
              With our easy AI-based ordering system, you can place your order in just a tap. We use fresh ingredients every day, our chefs prepare everything with care, and you get a smooth and enjoyable dining experience.

            </p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className={styles.contactFullSection}>
        <div className={styles.contactContainer}>
          <div className={styles.contactHeader}>
            <h4 className={styles.sectionTopline}>Get In Touch</h4>
            <h2 className={styles.sectionTitle}>We'd Love to <span>Hear From You</span></h2>
            <div className={styles.titleDividerCenter}></div>
            <p>Whether you have a question about our menu, reservations, or anything else, our team is ready to answer all your questions.</p>
          </div>
          <div className={styles.contactGridFull}>
            <div className={styles.contactInfoCard}>
              <div className={styles.contactIconLarge}>📍</div>
              <h3>Visit Us</h3>
              
              <p>udupi, India 123456</p>
            </div>
            <div className={styles.contactInfoCard}>
              <div className={styles.contactIconLarge}>📞</div>
              <h3>Call Us</h3>
              <p>+91 98765 43210</p>
              <p>Mon-Sun: 10AM - 11PM</p>
            </div>
            <div className={styles.contactInfoCard}>
              <div className={styles.contactIconLarge}>📧</div>
              <h3>Email Us</h3>
              <p>royalrasoi@gmail.com</p>
              <p>support@royalrasoi.com</p>
            </div>
          </div>
          <div className={styles.bannerContact}>
            <h3>Ready to experience the future?</h3>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '15px' }}>
              <Link to="/menulayout" className={styles.contactOrderBtn}>Order Now</Link>
              <Link to="/reserve" className={styles.contactOrderBtn} style={{ background: 'transparent', border: '2px solid var(--accent)'}}>Book a Table</Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default Home;