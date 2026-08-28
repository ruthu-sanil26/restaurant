import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import styles from "./OrderMenu.module.css";
import AIAgent from "../components/AIAgent";

// --- IMAGE IMPORTS ---
import chickenBurgerImg from "../assets/burger.jpg";
import cheesePizzaImg from "../assets/cheese pizza.jpg";
import frenchFriesImg from "../assets/french fries.jpg";
import ChickenBryaniImg from "../assets/bryani.jpg";
import FriedRiceImg from "../assets/fried rice.jpg";
import Panner65Img from "../assets/Panner 65.jpg";
import PannerImg from "../assets/panner.jpg";
import choclatecakeImg from "../assets/choclate cake.jpg";
import choclatelavacakeImg from "../assets/choclate lava cake.jpg";
import freshjuiceImg from "../assets/fresh juice.jpg";
import coldcoffeeImg from "../assets/coldcoffee.jpg";
import coconuticecreamImg from "../assets/coconut icecream.jpg";
import choclateicecreamImg from "../assets/choclate icecream.jpg";
import kajukatliicecreamImg from "../assets/kaju katli icecream.jpg";
import chikuicecreamImg from "../assets/chiku icecream.jpg";
import deathbychoclateImg from "../assets/death by choclate.jpg";
import limesodaImg from "../assets/lime soda.jpg";
import verginmojitoImg from "../assets/vergin mojito.jpg";
import cocacolaImg from "../assets/cocacola.jpg";
import kalakattaImg from "../assets/kala katta.jpg";
import mangojuiceImg from "../assets/mango juice.jpg";
import peachiceteaImg from "../assets/peach ice tea.jpg";
import gobimanchurianImg from "../assets/gobi manchurian.jpg";
import chickenkebabImg from "../assets/chicken kebab.jpg";
import chickenImg from "../assets/chicken.jpg";
import chickencomboImg from "../assets/chicken combo.jpg";
import chickendonnebryaniImg from "../assets/chicken donne bryani.jpg";
import paneerbiryaniImg from "../assets/paneer biryani.jpg";
import chickennoodlesImg from "../assets/chicken noodles.jpg";
import pinksaucepastaImg from "../assets/pink sauce pasta.jpg";
import vegsouthindianthaliImg from "../assets/veg south indian thali.jpg";
import babycornchillyImg from "../assets/baby corn chilly.jpg";
import chickenchillyImg from "../assets/chicken chilly.jpg";
import roastedalmondicecreamImg from "../assets/roasted almond icecream.jpg";
import buttermilkImg from "../assets/butter milk.jpg";
import kesarpistachioiecreamImg from "../assets/kesar pistachio iecream.jpg";
import butterchickenImg from "../assets/butter chicken.jpg";
import nonvegthaliImg from "../assets/non veg thali.jpg";
import vegpulaoImg from "../assets/veg pulao.jpg";
import mushroomchillyImg from "../assets/mushroom chilly.jpg";
import vegsaladImg from "../assets/veg salad.jpg";
import cornsaladImg from "../assets/corn salad.jpg";
import muttonfryImg from "../assets/mutton fry.jpg";
import chickenpepperdryImg from "../assets/chicken pepper dry.jpg";
import fishfryImg from "../assets/fish fry.jpg";
import fishcurryImg from "../assets/fish curry.jpg";
import pineappleImg from "../assets/pineapple.jpg";
import mangolassiImg from "../assets/mango lassi.jpg";
import greenappleImg from "../assets/green apple.jpg";
import tiramisuImg from "../assets/tiramisu.jpg";
import pastryImg from "../assets/pastry.jpg";
import gudbadImg from "../assets/gudbad.jpg";
import bbqchickenImg from "../assets/Bbq chicken.jpeg";
import soyachaapImg from "../assets/soya chap biryani.jpeg";
import soyachunkImg from "../assets/soya chunk chilly.jpeg";
import chickengheeroastImg from "../assets/chicken ghee roast.jpeg";
import eggbiryaniImg from "../assets/egg biryani.jpeg";
import cheeseballImg from "../assets/cheese ball.jpeg";
import paneertikaImg from "../assets/paneer tika.jpeg";
import prawnsImg from "../assets/prawns chilly.jpeg";
import fishsushimiImg from "../assets/fish sushi.jpeg";
import naanImg from "../assets/naan.jpeg";
import rajmachawalImg from "../assets/rajma chawal.jpeg";
import abcImg from "../assets/ABC Juice.jpeg";
import sugarcanejuiceImg from "../assets/sugarcane juice.jpeg";
import passionfruitjuiceImg from "../assets/passion fruit juice.jpeg";
import tendercoconutjuiceImg from "../assets/tender coconut milkshake.jpeg";
import kokumjuiceImg from "../assets/Kokum Sharba.jpeg";
import lycheejuiceImg from "../assets/Lychee Juice.jpeg";
import grapejuiceImg from "../assets/Grape Juice.jpeg";
import aampanaImg from "../assets/Aam Panna.jpeg";
import dalchawalImg from "../assets/dal chawal.jpeg";
import honeycombImg from "../assets/Honeycomb icecream.jpeg";
import cookiedoughImg from "../assets/Cookie Dough icecream.jpeg";
import mangosorbetImg from "../assets/Mango Sorbet.jpeg";
import rockyroadImg from "../assets/Rocky Road.jpeg";
import cookiesandcreamImg from "../assets/Cookies and Cream.jpeg";
import vanillabeanImg from "../assets/Vanilla Bean.jpeg";
import oldfashionchoclateImg from "../assets/Old-Fashioned Chocolate.jpeg";
import saltedcramImg from "../assets/Salted Caramel.jpeg";
import momosImg from "../assets/momos.jpeg";

function OrderMenu() {
  const { tableId } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [showAI, setShowAI] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [tableData, setTableData] = useState(null);
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Cart state
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [cartToast, setCartToast] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [demoOtpCode, setDemoOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!customerPhone || otpLoading) return;
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await api.post('/public/orders/send-otp', { phone: customerPhone });
      if (res.data?.code) {
        setDemoOtpCode(res.data.code);
      }
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      setOtpError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePhoneChange = (val) => {
    setCustomerPhone(val);
    setOtpSent(false);
    setOtpCode("");
    setOtpError("");
  };

  // AI Agent redirection state
  const [initialAIItem, setInitialAIItem] = useState(null);

  const imageMap = {
    "Chicken Burger": chickenBurgerImg,
    "Cheese Pizza": cheesePizzaImg,
    "French Fries": frenchFriesImg,
    "Chicken Biryani": ChickenBryaniImg,
    "Fried Rice": FriedRiceImg,
    "Paneer 65": Panner65Img,
    "Paneer Curry": PannerImg,
    "Chocolate Cake": choclatecakeImg,
    "Chocolate Lava Cake": choclatelavacakeImg,
    "Fresh juice": freshjuiceImg,
    "Cold Coffee": coldcoffeeImg,
    "Tender coconut Ice Cream": coconuticecreamImg,
    "Chocolate Ice Cream": choclateicecreamImg,
    "Kaju katli Ice Cream": kajukatliicecreamImg,
    "Chiku Ice Cream": chikuicecreamImg,
    "Death by Chocolate": deathbychoclateImg,
    "Lime Soda": limesodaImg,
    "Virgin Mojito": verginmojitoImg,
    "Coca cola": cocacolaImg,
    "Kalakatta": kalakattaImg,
    "Mango Juice": mangojuiceImg,
    "Peach Ice Tea": peachiceteaImg,
    "Gobi Manchurian": gobimanchurianImg,
    "Chicken Kebab": chickenkebabImg,
    "Baked Chicken": chickenImg,
    "Chicken Combo": chickencomboImg,
    "Chicken Donne Biryani": chickendonnebryaniImg,
    "Panner Biryani": paneerbiryaniImg,
    "Chicken Noodles": chickennoodlesImg,
    "Pink Sauce Pasta": pinksaucepastaImg,
    "Veg South Indian Thali": vegsouthindianthaliImg,
    "Baby Corn Chilly": babycornchillyImg,
    "Chicken Chilly": chickenchillyImg,
    "Roasted Almond Ice Cream": roastedalmondicecreamImg,
    "Buttermilk": buttermilkImg,
    "Kesar Pistachio Ice Cream": kesarpistachioiecreamImg,
    "Butter Chicken": butterchickenImg,
    "Non Veg Thali": nonvegthaliImg,
    "Veg Pulao": vegpulaoImg,
    "Mushroom Chilly": mushroomchillyImg,
    "Veg Salad": vegsaladImg,
    "Corn Salad": cornsaladImg,
    "Mutton Fry": muttonfryImg,
    "Chicken Pepper Dry": chickenpepperdryImg,
    "Fish Fry": fishfryImg,
    "Fish Curry": fishcurryImg,
    "Pineapple juice": pineappleImg,
    "Mango Lassi": mangolassiImg,
    "Green Apple Juice": greenappleImg,
    "Tiramisu": tiramisuImg,
    "Pastry": pastryImg,
    "Gudbad": gudbadImg,
    "BBQ Chicken": bbqchickenImg,
    "Soya Chap Biryani": soyachaapImg,
    "Soya Chunk Chilly": soyachunkImg,
    "Chicken Ghee Roast": chickengheeroastImg,
    "Egg Biryani": eggbiryaniImg,
    "Cheese Ball": cheeseballImg,
    "Paneer Tika": paneertikaImg,
    "Prawns Chilly": prawnsImg,
    "Fish Sushi": fishsushimiImg,
    "Naan": naanImg,
    "Rajma Chawal": rajmachawalImg,
    "ABC Juice": abcImg,
    "Sugarcane Juice": sugarcanejuiceImg,
    "Passion Fruit Juice": passionfruitjuiceImg,
    "Tender Coconut Milkshake": tendercoconutjuiceImg,
    "Kokum Sharbat": kokumjuiceImg,
    "Lychee Juice": lycheejuiceImg,
    "Grape Juice": grapejuiceImg,
    "Aam Pana": aampanaImg,
    "Dal Chawal": dalchawalImg,
    "Honeycomb Ice Cream": honeycombImg,
    "Cookie Dough Ice Cream": cookiedoughImg,
    "Mango Sorbet": mangosorbetImg,
    "Rocky Road": rockyroadImg,
    "Cookies and Cream": cookiesandcreamImg,
    "Vanilla Bean": vanillabeanImg,
    "Old Fashioned Chocolate": oldfashionchoclateImg,
    "Salted Caramel": saltedcramImg,
    "Momos": momosImg
  };

  const getMenuImage = (name) => {
    if (!name) return "/placeholder-image.jpg";
    if (imageMap[name]) return imageMap[name];
    const cleanKey = name.toLowerCase().replace(/\s+/g, "");
    const foundKey = Object.keys(imageMap).find(k => k.toLowerCase().replace(/\s+/g, "") === cleanKey);
    return imageMap[foundKey] || "/placeholder-image.jpg";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tableRes, menuRes, categoryRes] = await Promise.all([
          api.get(`/tables/number/${tableId}`),
          api.get("/menu"),
          api.get("/categories")
        ]);
        setTableData(tableRes.data);
        setMenu(menuRes.data);
        setCategories(categoryRes.data);
      } catch (err) { console.error("Fetch error:", err); }
      finally { setLoadingMenu(false); }
    };
    fetchData();
  }, [tableId]);

  /*  ─────────── CART HELPERS ─────────── */

  const showToast = (msg) => {
    setCartToast(msg);
    setTimeout(() => setCartToast(""), 2500);
  };

  /** Open AI Agent for customization or add directly if no options */
  const handleAddToCart = (item) => {
    if (item.customizationOptions && item.customizationOptions.length > 0) {
      setInitialAIItem(item);
      setShowAI(true);
    } else {
      addToCart(item, {});
    }
  };

  const addToCart = (item, customization) => {
    setCart(prev => {
      // Match by ID and customization signature
      const customSig = JSON.stringify(customization);
      const existing = prev.find(ci => ci._id === item._id && JSON.stringify(ci.customization) === customSig);
      if (existing) {
        return prev.map(ci =>
          ci._id === item._id && JSON.stringify(ci.customization) === customSig
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [...prev, { ...item, quantity: 1, customization }];
    });
    showToast(`✓ ${item.name} added to cart`);
  };



  const removeFromCart = (idx) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const changeQty = (idx, delta) => {
    setCart(prev => prev.map((ci, i) => {
      if (i !== idx) return ci;
      const newQty = ci.quantity + delta;
      return newQty < 1 ? null : { ...ci, quantity: newQty };
    }).filter(Boolean));
  };

  const getItemTotalPrice = (menuItem, customizationObj) => {
    let total = menuItem.price || 0;
    if (!customizationObj || !menuItem.customizationOptions) return total;

    menuItem.customizationOptions.forEach(opt => {
      const selected = customizationObj[opt.label];
      if (selected) {
        if (Array.isArray(selected)) {
          selected.forEach(s => {
            const choice = opt.choices?.find(c => c.name === s);
            if (choice?.extraPrice) total += Number(choice.extraPrice);
          });
        } else {
          const choice = opt.choices?.find(c => c.name === selected);
          if (choice?.extraPrice) total += Number(choice.extraPrice);
        }
      }
    });
    return total;
  };

  const cartTotal = cart.reduce((sum, ci) => sum + getItemTotalPrice(ci, ci.customization) * ci.quantity, 0);
  const cartCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  /* ─────────── PLACE ORDER ─────────── */
  const placeOrder = async () => {
    if (cart.length === 0) return;
    if (!tableData?._id) { alert("Table not found."); return; }

    if (!customerName || !customerName.trim()) {
      setOtpError("Please enter your full name.");
      return;
    }

    if (!customerPhone || !customerPhone.trim()) {
      setOtpError("Please enter your phone number.");
      return;
    }

    if (!otpSent) {
      setOtpError("Please click 'Send OTP' to receive your verification code.");
      return;
    }
    if (!otpCode || otpCode.length !== 6) {
      setOtpError("Please enter the 6-digit verification OTP code.");
      return;
    }

    setPlacingOrder(true);
    setOtpError("");
    try {
      const res = await api.post("/public/orders", {
        table: tableData._id,
        customerName: customerName,
        customerPhone: customerPhone,
        otpCode,
        items: cart.map(ci => ({
          menuItem: ci._id,
          quantity: ci.quantity,
          customization: ci.customization || {},
        })),
      });
      setOrderSuccess(res.data);
      localStorage.setItem("bill", JSON.stringify(res.data));
      setCart([]);
      setShowCart(false);
      setCustomerName("");
      setCustomerPhone("");
      setOtpSent(false);
      setOtpCode("");
    } catch (err) {
      console.error("Order Error:", err.response?.data || err.message);
      const errMsg = err.response?.data?.message || "Failed to place order";
      alert(errMsg);
      setOtpError(errMsg);
    } finally {
      setPlacingOrder(false);
    }
  };

  /* ─────────── FILTER LOGIC ─────────── */
  const filteredMenu = menu.filter((item) => {
    const matchesCategory = category === "All" || item.category?.name === category;
    const matchesType =
      type === "All" ||
      item.type?.trim().toLowerCase() === type.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesType && matchesSearch;
  });

  if (loadingMenu) return <div className={styles.loading}>Loading menu...</div>;

  return (
    <div className={styles.menuContainer}>
      <h1 className={styles.menuTitle}>
        Menu for Table {tableData?.number || tableId}
      </h1>

      {/* ─── Cart Toast ─── */}
      {cartToast && <div className={styles.cartToast}>{cartToast}</div>}

      {/* ─── Order Success Banner ─── */}
      {orderSuccess && (
        <div className={styles.orderSuccessBanner}>
          <span className={styles.successIcon}>✅</span>
          <div>
            <p className={styles.successTitle}>Order Placed!</p>
            <p className={styles.successSub}>Order #{orderSuccess._id?.slice(-6)} · ₹{orderSuccess.totalAmount}</p>
          </div>
          <button className={styles.dismissBtn} onClick={() => setOrderSuccess(null)}>✕</button>
        </div>
      )}

      <div className={styles.searchBarContainer}>
        <input
          type="text"
          placeholder="Search for food, drinks..."
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={styles.categoryBar}>
        <button className={category === "All" ? styles.active : ""} onClick={() => { setCategory("All"); setType("All"); }}>All</button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            className={category === cat.name ? styles.active : ""}
            onClick={() => { setCategory(cat.name); setType("All"); }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className={styles.menuGrid}>
        {filteredMenu.length > 0 ? (
          filteredMenu.map((item) => (
            <div key={item._id} className={styles.menuCard}>
              <div className={styles.imageWrapper}>
                <img
                  src={getMenuImage(item.name)}
                  alt={item.name}
                  className={styles.menuImage}
                />
                {item.customizationOptions?.length > 0 && (
                  <span className={styles.customizablePill}>🎛️ Customizable</span>
                )}
              </div>

              <div className={styles.cardDetails}>
                <h3>{item.name}</h3>
                <p className={styles.description}>{item.description}</p>
                <p className={styles.price}>₹{item.price}</p>

              </div>
            </div>
          ))
        ) : (
          <div className={styles.noItems}>No {type !== "All" ? type : ""} items found in {category}.</div>
        )}
      </div>

      {/* ─── Floating Cart Button ─── */}
      {cartCount > 0 && (
        <button className={styles.floatingCartBtn} onClick={() => setShowCart(true)}>
          🛒 <span className={styles.cartCountBadge}>{cartCount}</span>
          <span className={styles.cartBtnLabel}>View Cart · ₹{cartTotal}</span>
        </button>
      )}

      {/* ─── Cart Drawer ─── */}
      {showCart && (
        <div className={styles.cartOverlay} onClick={() => setShowCart(false)}>
          <div className={styles.cartDrawer} onClick={e => e.stopPropagation()}>
            <div className={styles.cartDrawerHeader}>
              <h2 className={styles.cartDrawerTitle}>🛒 Your Cart</h2>
              <button className={styles.cartCloseBtn} onClick={() => setShowCart(false)}>✕</button>
            </div>

            <div className={styles.cartItems}>
              {cart.map((ci, idx) => (
                <div key={idx} className={styles.cartItem}>
                  <img src={getMenuImage(ci.name)} alt={ci.name} className={styles.cartItemImg} />
                  <div className={styles.cartItemInfo}>
                    <p className={styles.cartItemName}>{ci.name}</p>
                    {/* Show customization summary */}
                    {ci.customization && Object.keys(ci.customization).length > 0 && (
                      <div className={styles.cartCustomization}>
                        {Object.entries(ci.customization).map(([label, val]) => (
                          val && (!Array.isArray(val) || val.length > 0) ? (
                            <span key={label} className={styles.cartCustomTag}>
                              {label}: {Array.isArray(val) ? val.join(", ") : val}
                            </span>
                          ) : null
                        ))}
                      </div>
                    )}
                    <p className={styles.cartItemPrice}>₹{getItemTotalPrice(ci, ci.customization) * ci.quantity}</p>
                  </div>
                  <div className={styles.cartQtyControls}>
                    <button onClick={() => changeQty(idx, -1)}>−</button>
                    <span>{ci.quantity}</span>
                    <button onClick={() => changeQty(idx, 1)}>+</button>
                  </div>
                  <button className={styles.cartRemoveBtn} onClick={() => removeFromCart(idx)}>🗑️</button>
                </div>
              ))}
            </div>

            <div className={styles.cartFooter}>
              <div className={styles.customerDetailsForm} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: '#fff', outline: 'none' }}
                />
                <input
                  type="tel"
                  placeholder="Phone Number *"
                  value={customerPhone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: '#fff', outline: 'none' }}
                />

                {customerPhone && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={otpLoading}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#ff6b35',
                          color: '#fff',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          opacity: otpLoading ? 0.7 : 1
                        }}
                      >
                        {otpSent ? 'Resend OTP 🔄' : 'Send OTP 📲'}
                      </button>
                      {otpSent && (
                        <input
                          type="text"
                          placeholder="Enter 6-Digit OTP"
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value)}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: '#fff', outline: 'none' }}
                        />
                      )}
                    </div>
                    {otpError && (
                      <span style={{ fontSize: '0.75rem', color: '#ff5252', fontWeight: 'bold' }}>⚠️ {otpError}</span>
                    )}
                    {otpSent && demoOtpCode && (
                      <div style={{ marginTop: '8px', padding: '8px 12px', background: '#332a15', border: '1px dashed #e8b86d', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#ffd700' }}>
                        <span>🔑 Generated OTP: <strong>{demoOtpCode}</strong></span>
                        <button
                          type="button"
                          onClick={() => setOtpCode(demoOtpCode)}
                          style={{ background: '#25d366', color: '#000', border: 'none', borderRadius: '6px', padding: '4px 10px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          ⚡ Auto-fill
                        </button>
                      </div>
                    )}
                    {otpSent && !otpCode && !otpError && !demoOtpCode && (
                      <span style={{ fontSize: '0.75rem', color: '#4caf50' }}>OTP code sent to {customerPhone}.</span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.cartTotalRow}>
                <span>Total</span>
                <span className={styles.cartTotalAmt}>₹{cartTotal}</span>
              </div>
              <button
                className={styles.placeOrderBtn}
                onClick={placeOrder}
                disabled={placingOrder || !customerName.trim() || !customerPhone.trim() || !otpCode}
                style={{
                  opacity: (placingOrder || !customerName.trim() || !customerPhone.trim() || !otpCode) ? 0.6 : 1,
                  cursor: (placingOrder || !customerName.trim() || !customerPhone.trim() || !otpCode) ? 'not-allowed' : 'pointer'
                }}
              >
                {placingOrder
                  ? "Placing Order…"
                  : !customerName.trim() || !customerPhone.trim()
                  ? "🔒 Enter Name & Phone to Order"
                  : !otpCode
                  ? "🔒 Verify OTP to Order"
                  : "✅ Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}



      {showTooltip && (
        <div className={styles.aiTooltip} onClick={() => { setShowAI(true); setShowTooltip(false); }}>
          <span className={styles.aiTooltipText}>Click here to ask AI! 💬</span>
        </div>
      )}
      <button className={styles.aiGlowButton} onClick={() => { setShowAI(true); setShowTooltip(false); }}>
        <span className={styles.aiIcon}>
          <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
            <line x1="26" y1="52" x2="26" y2="34" stroke="#ff007f" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="74" y1="52" x2="74" y2="34" stroke="#ff007f" strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="26" cy="30" r="6.5" fill="#ff007f" />
            <circle cx="74" cy="30" r="6.5" fill="#ff007f" />
            <rect x="38" y="16" width="24" height="8" rx="4" fill="#ffd700" />
            <rect x="24" y="24" width="52" height="52" rx="14" fill="url(#headGrad)" stroke="#b8aff5" strokeWidth="2.5" />
            <rect x="30" y="32" width="40" height="24" rx="8" fill="#1b1c3a" stroke="#2b2d5a" strokeWidth="1.5" />
            <rect x="36" y="39" width="10" height="8" rx="4" fill="#00f3ff" style={{ filter: "drop-shadow(0 0 4px #00f3ff)" }} />
            <rect x="54" y="39" width="10" height="8" rx="4" fill="#00f3ff" style={{ filter: "drop-shadow(0 0 4px #00f3ff)" }} />
            <rect x="44" y="62" width="12" height="5" rx="2.5" fill="#3a3b5c" />
            <defs>
              <linearGradient id="headGrad" x1="24" y1="24" x2="76" y2="76" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#ece9f9" />
                <stop offset="100%" stopColor="#cac2f5" />
              </linearGradient>
            </defs>
          </svg>
        </span>
      </button>

      {showAI && tableData && (
        <AIAgent
          onClose={() => { setShowAI(false); setInitialAIItem(null); }}
          tableId={tableData._id}
          tableNumber={tableData.number}
          menu={menu}
          categories={categories}
          initialCustomizeItem={initialAIItem}
          clearInitialItem={() => setInitialAIItem(null)}
        />
      )}
    </div>
  );
}

export default OrderMenu;
