import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import styles from './AIAgent.module.css';
import billStyles from '../pages/Bill.module.css';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "";
const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Simple deep comparison helper for customizations
const isSameCustomization = (c1, c2) => {
  return JSON.stringify(c1 || {}) === JSON.stringify(c2 || {});
};

const getChoiceName = (choice) => {
  if (!choice) return '';
  if (typeof choice === 'string') return choice;
  if (choice.name !== undefined) return choice.name;
  // Extract string from malformed object like {"0": "s", "1": "p"}
  const keys = Object.keys(choice).filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
  if (keys.length > 0) return keys.map(k => choice[k]).join('');
  return '';
};

const getChoicePrice = (choice) => {
  if (typeof choice === 'string') return 0;
  return choice?.extraPrice || 0;
};

// Render Markdown bold and new lines
const FormattedMessage = ({ text }) => {
  if (!text) return null;
  return (
    <>
      {text.split('\n').map((line, i, arr) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <span key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
            {i < arr.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
};

export default function AIAgent({ onClose, tableId, menu, categories, initialCustomizeItem, clearInitialItem }) {
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem(`ai_chat_${tableId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved chat:", e);
      }
    }
    return [
      {
        role: 'assistant',
        text: "Hi! I'm your restaurant assistant. You can select an item from the menu or ask me for a recommendation.",
        timestamp: formatTime(),
        type: 'greeting'
      },
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingOrder, setPendingOrder] = useState([]); // Array of { ...item, quantity, customization }
  const [eta, setEta] = useState(5);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [tableNumber, setTableNumber] = useState(null);

  // Customization state
  const [customizeTarget, setCustomizeTarget] = useState(null);
  const [custValues, setCustValues] = useState({});
  const [custError, setCustError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // Rating & Feedback State
  const [selectedRating, setSelectedRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Inline Reservation Form State
  const [resForm, setResForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: 2,
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    seatingArea: 'Main Dining Hall',
    occasion: 'Casual Dining',
    notes: ''
  });
  const [resSubmitting, setResSubmitting] = useState(false);
  const [resError, setResError] = useState('');
  const [resCompletedMsgIndex, setResCompletedMsgIndex] = useState(null);

  // Cooking Note State
  const [cookingNoteText, setCookingNoteText] = useState('');
  const [cookingNoteSubmitting, setCookingNoteSubmitting] = useState(false);

  const handleSendOTP = async () => {
    if (!customerEmail || otpLoading) return;
    setOtpLoading(true);
    setOtpError("");
    try {
      await api.post('/public/orders/send-otp', { email: customerEmail });
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      setOtpError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleEmailChange = (val) => {
    setCustomerEmail(val);
    setOtpSent(false);
    setOtpCode("");
    setOtpError("");
  };

  // Speech and Voice Assistant States
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechEnabledRef = useRef(speechEnabled);
  const sendRef = useRef(null);

  useEffect(() => {
    speechEnabledRef.current = speechEnabled;
  }, [speechEnabled]);

  const speak = (text) => {
    if (!speechEnabledRef.current || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/[✨🔥👨‍🍳🥗🍛🍰🥤⏳✅❌🔔⚠️✕✓🛒🗑️]/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const defaultVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
      if (defaultVoice) {
        utterance.voice = defaultVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis failed:", e);
    }
  };

  useEffect(() => {
    // Speech Recognition initialization
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
          if (sendRef.current) {
            sendRef.current(transcript);
          }
        }
      };

      rec.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    // Speak greeting on mount
    const timeout = setTimeout(() => {
      speak("Hi! I'm your restaurant assistant. You can select an item from the menu or ask me for a recommendation.");
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInput('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  useEffect(() => {
    sessionStorage.setItem(`ai_chat_${tableId}`, JSON.stringify(messages));
  }, [messages, tableId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, customizeTarget]);

  useEffect(() => {
    if (!tableId) return;
    const fetchActiveOrder = async () => {
      try {
        const res = await api.get(`/public/tables/${tableId}`);
        if (res.data.number) setTableNumber(res.data.number);
        if (res.data.currentOrder) {
          setActiveOrderId(res.data.currentOrder);
        }
      } catch (err) {
        console.error("Failed to fetch table for AI socket:", err);
      }
    };
    fetchActiveOrder();
  }, [tableId]);

  useEffect(() => {
    if (!activeOrderId) return;
    const socket = io(SOCKET_URL || window.location.origin, { path: "/socket.io" });
    socketRef.current = socket;
    socket.emit("joinOrder", activeOrderId);
    let lastStatus = null;
    let lastPaymentStatus = null;
    let timerId = null;

    socket.on("orderUpdate", (updatedOrder) => {
      if (updatedOrder.paymentStatus === 'paid' && lastPaymentStatus !== 'paid') {
        const activeBill = localStorage.getItem("bill");
        if (activeBill) {
          try {
            const parsed = JSON.parse(activeBill);
            parsed.paymentStatus = 'paid';
            localStorage.setItem("last_paid_bill", JSON.stringify(parsed));
          } catch (e) {
            console.error("Failed to backup bill to last_paid_bill", e);
          }
        }
        localStorage.removeItem("bill");
        localStorage.removeItem("cart");
        localStorage.removeItem("orders");

        const feedbackPromptText = "🎉 Payment Successful! Thank you for dining with us at Royal Rasoi. How was your experience today?";
        setMessages((m) => [...m, {
          role: 'assistant',
          text: feedbackPromptText,
          type: 'feedback_prompt',
          timestamp: formatTime()
        }]);
        speak(feedbackPromptText);
      } else if (updatedOrder.status !== lastStatus) {
        // Do not notify the customer that the order went back to 'pending' after adding new items
        if (updatedOrder.status !== 'pending' || !['ready', 'served'].includes(lastStatus)) {
          const statusMsgText = `Notification: Your order status is now ${updatedOrder.status}.`;
          setMessages((m) => [...m, {
            role: 'assistant',
            text: `🔔 Notification: Your order status is now "${updatedOrder.status}".`,
            timestamp: formatTime()
          }]);
          speak(statusMsgText);
        }
        lastStatus = updatedOrder.status;
        if (updatedOrder.status === 'served') {
          if (timerId) clearTimeout(timerId);
          timerId = setTimeout(() => {
            const followUpText = "We hope you are enjoying your meal! How would you rate your experience today?";
            setMessages((m) => [...m, {
              role: 'assistant',
              text: followUpText,
              type: 'feedback_prompt',
              timestamp: formatTime()
            }]);
            speak(followUpText);
          }, 3000);
        }
      }
      lastPaymentStatus = updatedOrder.paymentStatus;
    });

    return () => {
      if (timerId) clearTimeout(timerId);
      socket.off("orderUpdate");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeOrderId, tableId]);

  // Handle initial customize item from OrderMenu
  useEffect(() => {
    if (initialCustomizeItem) {
      setMessages(m => [...m, {
        role: 'assistant',
        text: `Let's customize your ${initialCustomizeItem.name}. Please select your preferences below.`,
        timestamp: formatTime()
      }]);
      handleAddItem(initialCustomizeItem);
      if (clearInitialItem) clearInitialItem();
    }
  }, [initialCustomizeItem]);

  /* ---------------- QUANTITY LOGIC ---------------- */
  const handleUpdateQty = (menuItem, delta, customization = {}) => {
    if (!menuItem?._id) return;
    setPendingOrder(prev => {
      const itemId = String(menuItem._id);
      const existingIndex = prev.findIndex(i =>
        String(i._id) === itemId && isSameCustomization(i.customization, customization)
      );

      if (existingIndex > -1) {
        const next = [...prev];
        const newQty = next[existingIndex].quantity + delta;
        if (newQty <= 0) {
          next.splice(existingIndex, 1);
        } else {
          next[existingIndex] = { ...next[existingIndex], quantity: newQty };
        }
        return next;
      }

      if (delta > 0) {
        return [...prev, { ...menuItem, quantity: 1, customization }];
      }
      return prev;
    });
  };

  const triggerSmartPairingSuggestion = (addedItem) => {
    if (!addedItem || !menu || menu.length === 0) return;
    const nameLower = (addedItem.name || '').toLowerCase();
    const tagsLower = (addedItem.tags || []).join(' ').toLowerCase();
    const combined = `${nameLower} ${tagsLower}`;

    let candidates = [];
    let pairingMsg = '';

    const isMainOrCurry = /curry|biryani|paneer|chicken|mutton|masala|main|thali|pasta|pizza|burger|tikka|dal|gobi|aloo/i.test(combined);
    const isStarter = /starter|appetizer|fry|fries|wings|roll|soup|salad|kebab|65/i.test(combined);

    if (isMainOrCurry || isStarter) {
      candidates = menu.filter(i => {
        const iName = i.name.toLowerCase();
        const iCategoryName = (typeof i.category === 'string' ? i.category : i.category?.name || '').toLowerCase();
        const matchesType = /naan|roti|lassi|shake|juice|soda|drink|beverage|ice cream|gulab jamun|dessert/i.test(`${iName} ${iCategoryName}`);
        const notInCart = !pendingOrder.some(p => String(p._id) === String(i._id));
        return matchesType && notInCart && String(i._id) !== String(addedItem._id);
      }).slice(0, 3);

      if (candidates.length > 0) {
        const topNames = candidates.map(c => c.name).slice(0, 2).join(' or ');
        pairingMsg = `🍹 **Perfect Pairing Suggestion!** Would you like to add a ${topNames} to go with your **${addedItem.name}**?`;
      }
    }

    if (candidates.length > 0 && pairingMsg) {
      setTimeout(() => {
        setMessages(m => [
          ...m,
          {
            role: 'assistant',
            text: pairingMsg,
            type: 'recommendation',
            items: candidates.map(c => String(c._id)),
            timestamp: formatTime()
          }
        ]);
        speak(`Would you like a ${candidates[0].name} to complete your meal?`);
      }, 700);
    }
  };

  const handleAddItem = (item) => {
    if (Array.isArray(item.customizationOptions) && item.customizationOptions.length > 0) {
      const defaults = {};
      item.customizationOptions.forEach(opt => {
        if (opt.type === 'select') {
          defaults[opt.label] = getChoiceName(opt.choices[0]);
        }
        else if (opt.type === 'checkbox') defaults[opt.label] = [];
        else defaults[opt.label] = '';
      });
      setCustValues(defaults);
      setCustError("");
      setCustomizeTarget(item);
    } else {
      handleUpdateQty(item, 1);
      triggerSmartPairingSuggestion(item);
    }
  };

  const handleCheckboxChange = (label, choice, checked) => {
    setCustValues(prev => {
      const current = prev[label] || [];
      return {
        ...prev,
        [label]: checked ? [...current, choice] : current.filter(c => c !== choice),
      };
    });
  };

  const confirmCustomization = () => {
    setCustError("");
    // Validate required fields
    for (const opt of customizeTarget.customizationOptions) {
      if (opt.required) {
        const val = custValues[opt.label];
        if (opt.type === 'checkbox' && (!val || val.length === 0)) {
          setCustError(`"${opt.label}" is required.`);
          return;
        }
        if ((opt.type === 'select' || opt.type === 'text') && (!val || !String(val).trim())) {
          setCustError(`"${opt.label}" is required.`);
          return;
        }
      }
    }

    handleUpdateQty(customizeTarget, 1, custValues);
    triggerSmartPairingSuggestion(customizeTarget);
    setCustomizeTarget(null);
    setCustValues({});
  };

  /* ---------------- ETA CALCULATOR ---------------- */
  useEffect(() => {
    const fetchETA = async () => {
      if (pendingOrder.length === 0) return;
      try {
        const payload = pendingOrder.map(i => ({ menuItem: i._id, quantity: i.quantity }));
        const res = await api.post('/public/orders/eta', { items: payload });
        setEta(res.data.eta);
      } catch (err) { console.error("ETA error", err); }
    };
    const timeout = setTimeout(fetchETA, 500);
    return () => clearTimeout(timeout);
  }, [pendingOrder]);

  /* ---------------- SEND PENDING ORDER ---------------- */
  const submitOrder = async () => {
    if (pendingOrder.length === 0 || loading) return;

    // If customer provided an email, ensure valid email format and OTP verification
    if (customerEmail && customerEmail.trim()) {
      if (!customerEmail.includes('@')) {
        setOtpError("Please enter a valid email address.");
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
    }

    setLoading(true);
    setOtpError("");
    try {
      const res = await api.post('/public/orders', {
        table: tableId,
        customerName: customerName.trim() || `Guest (Table ${tableNumber || ''})`,
        customerEmail: customerEmail.trim(),
        otpCode: customerEmail.trim() ? otpCode : undefined,
        items: pendingOrder.map(i => ({
          menuItem: i._id,
          quantity: i.quantity,
          customization: i.customization || {},
        }))
      });
      if (res.data?._id) setActiveOrderId(res.data._id);
      localStorage.setItem("bill", JSON.stringify({ ...res.data, _tableId: tableId }));
      const orderSummaryText = `Order placed for: ${pendingOrder.map(i => `${i.name} (x${i.quantity})`).join(', ')}`;
      setMessages(m => [...m, {
        role: 'assistant',
        text: `✅ ${orderSummaryText}`,
        type: 'order_success',
        timestamp: formatTime()
      }]);
      speak(orderSummaryText);
      setPendingOrder([]);
      setOtpSent(false);
      setOtpCode("");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to place order";
      setMessages(m => [...m, { role: 'assistant', text: `❌ ${errorMsg}`, timestamp: formatTime() }]);
      speak(errorMsg);
      setOtpError(errorMsg);
    } finally { setLoading(false); }
  };

  const handleDodoPayment = async () => {
    setLoading(true);
    try {
      // Resolve the active order ID: use state, or fall back to current table's active order
      let resolvedOrderId = activeOrderId;
      if (!resolvedOrderId && tableId) {
        try {
          const tableRes = await api.get(`/public/tables/${tableId}`);
          resolvedOrderId = tableRes.data?.currentOrder || null;
          if (resolvedOrderId) setActiveOrderId(resolvedOrderId);
        } catch (e) {
          console.error('Could not fetch table active order:', e);
        }
      }
      if (!resolvedOrderId) {
        alert('No active order found for this table. Please place an order first.');
        return;
      }
      const returnUrl = `${window.location.origin}/bill`;
      const res = await api.post(`/public/orders/${resolvedOrderId}/dodo-checkout`, { returnUrl });
      if (res.data.checkout_url) {
        setMessages(m => [...m, {
          role: 'assistant',
          text: "Here is your secure payment link. Click the button below to complete your payment.",
          link: res.data.checkout_url,
          type: 'payment_link',
          timestamp: formatTime()
        }]);
      } else {
        alert("Payment URL not returned");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };


  const handleFeedbackSubmit = async () => {
    try {
      if (activeOrderId) {
        await api.post(`/public/orders/${activeOrderId}/feedback`, {
          rating: selectedRating,
          feedback: feedbackText,
        });
      }
      setFeedbackSubmitted(true);
      const thankYou = `⭐ Thank you for giving us a ${selectedRating}-star rating! Your feedback helps us improve. Enjoy your day! 😊`;
      setMessages((m) => [...m, {
        role: 'assistant',
        text: thankYou,
        timestamp: formatTime()
      }]);
      speak(thankYou);
    } catch (err) {
      console.error("Error submitting feedback:", err);
    }
  };

  const handleInlineReservationSubmit = async (msgIndex) => {
    if (!resForm.customerName.trim() || !resForm.customerPhone.trim() || !resForm.date || !resForm.time) {
      setResError("Please enter Name, Phone, Date, and Time.");
      return;
    }
    setResSubmitting(true);
    setResError('');
    try {
      const res = await api.post('/reservations/public', resForm);
      const booking = res.data;
      setResCompletedMsgIndex(msgIndex);
      const confirmText = `🎉 **Reservation Confirmed!**\n\n- **Booking Code:** \`${booking.bookingCode}\`\n- **Name:** ${booking.customerName}\n- **Date & Time:** ${booking.date} at ${booking.time}\n- **Party Size:** ${booking.partySize} guests\n- **Seating:** ${booking.seatingArea}\n\nWe look forward to hosting you at Royal Rasoi! 🍷`;
      setMessages((m) => [...m, {
        role: 'assistant',
        text: confirmText,
        timestamp: formatTime()
      }]);
      speak(`Reservation confirmed for ${booking.customerName} with booking code ${booking.bookingCode}!`);
    } catch (err) {
      console.error("Reservation Error:", err);
      setResError(err.response?.data?.message || "Failed to submit reservation.");
    } finally {
      setResSubmitting(false);
    }
  };

  const handleCookingNoteSubmit = async (targetOrderId) => {
    const idToUse = targetOrderId || activeOrderId;
    if (!cookingNoteText.trim() || !idToUse) return;
    setCookingNoteSubmitting(true);
    try {
      await api.patch(`/public/orders/${idToUse}/notes`, {
        notes: cookingNoteText
      });
      const noteSent = cookingNoteText.trim();
      setCookingNoteText('');
      const successMsg = `📝 Special instruction added to your order: "${noteSent}". Kitchen notified!`;
      setMessages((m) => [...m, {
        role: 'assistant',
        text: successMsg,
        timestamp: formatTime()
      }]);
      speak("Kitchen has been notified of your special cooking instructions!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to add cooking note.");
    } finally {
      setCookingNoteSubmitting(false);
    }
  };

  const send = async (overrideText) => {
    const text = typeof overrideText === 'string' ? overrideText.trim() : input.trim();
    if (!text || loading) return;
    if (typeof overrideText !== 'string') setInput('');
    setMessages((m) => [...m, { role: 'user', text, timestamp: formatTime() }]);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { message: text, orderId: activeOrderId });
      const replyText = data.reply.replace(/\$/g, '₹');
      setMessages((m) => [...m, { role: 'assistant', text: replyText, type: data.type, order: data.order, items: data.items, timestamp: formatTime() }]);
      speak(replyText);
      if (data.type === 'dodo_payment_redirect') {
        handleDodoPayment();
      }
    } catch {
      const errorText = "AI not responding...";
      setMessages((m) => [...m, { role: 'assistant', text: errorText, timestamp: formatTime() }]);
      speak(errorText);
    } finally { setLoading(false); }
  };
  sendRef.current = send;
  const getItemTotalPrice = (menuItem, customizationObj) => {
    let total = menuItem.price || 0;
    if (!customizationObj || !menuItem.customizationOptions) return total;

    menuItem.customizationOptions.forEach(opt => {
      const selected = customizationObj[opt.label];
      if (selected) {
        if (Array.isArray(selected)) {
          selected.forEach(s => {
            const choice = opt.choices?.find(c => getChoiceName(c) === s);
            total += Number(getChoicePrice(choice));
          });
        } else {
          const choice = opt.choices?.find(c => getChoiceName(c) === selected);
          total += Number(getChoicePrice(choice));
        }
      }
    });
    return total;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>AI Assistant (Table {tableNumber || "..."})</span>
          <div className={styles.headerControls}>
            <button
              className={`${styles.iconBtn} ${speechEnabled ? styles.activeSpeech : ''}`}
              onClick={() => setSpeechEnabled(!speechEnabled)}
              title={speechEnabled ? "Mute voice response" : "Enable voice response"}
            >
              {speechEnabled ? '🔊' : '🔇'}
            </button>
            <button className={styles.closeBtn} onClick={onClose}>×</button>
          </div>
        </div>

        <div className={styles.messages}>
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? styles.userMsg : (['reservation_form', 'reservation_link', 'order_progress_tracker'].includes(msg.type) ? `${styles.botMsg} ${styles.wideBotMsg}` : styles.botMsg)}>
              {msg.type === 'full_menu' ? 'Here is our menu:' : <FormattedMessage text={msg.text} />}
              {msg.timestamp && <span className={styles.timestamp}>{msg.timestamp}</span>}

              {(msg.type === 'greeting' || msg.type === 'payment_success') && (
                <div className={styles.quickActions}>
                  {categories && categories.length > 0 ? (
                    categories.map((cat) => {
                      const name = typeof cat === 'string' ? cat : cat.name;
                      let emoji = '🍽️';
                      const nameLower = name.toLowerCase();
                      if (nameLower.includes('starter') || nameLower.includes('appetizer')) emoji = '🥗';
                      else if (nameLower.includes('main')) emoji = '🍛';
                      else if (nameLower.includes('dessert') || nameLower.includes('sweet') || nameLower.includes('cake') || nameLower.includes('ice cream')) emoji = '🍰';
                      else if (nameLower.includes('drink') || nameLower.includes('beverage') || nameLower.includes('juice') || nameLower.includes('soda') || nameLower.includes('coffee') || nameLower.includes('lassi')) emoji = '🥤';

                      return (
                        <button
                          key={cat._id || name}
                          onClick={() => send(`Show me the ${name}`)}
                          className={styles.quickActionBtn}
                        >
                          {emoji} View {name}
                        </button>
                      );
                    })
                  ) : (
                    <>
                      <button onClick={() => send('Show me the starters')} className={styles.quickActionBtn}>🥗 View Starters</button>
                      <button onClick={() => send('Show me the main course')} className={styles.quickActionBtn}>🍛 View Main Courses</button>
                      <button onClick={() => send('Show me the desserts')} className={styles.quickActionBtn}>🍰 View Desserts</button>
                    </>
                  )}
                  <button onClick={() => send("What is the Chef's Recommendation?")} className={styles.quickActionBtn}>👨‍🍳 Chef's Recommendation</button>
                </div>
              )}

              {msg.type === 'payment_prompt' && (
                <>
                  {msg.order && (
                    <div className={billStyles.receipt} style={{ width: '100%', padding: '15px', marginTop: '10px', boxSizing: 'border-box' }}>
                      <h2 className={billStyles.restaurant}>Royal Rasoi</h2>
                      <p className={billStyles.address}>Udupi, Karnataka</p>
                      <p className={billStyles.address}>Ph: +91 98765 43210</p>
                      <div className={billStyles.line}></div>
                      <div style={{ textAlign: "left", marginBottom: "12px", fontSize: "0.9rem", display: 'flex', flexDirection: 'column', gap: '6px', color: '#000' }}>
                        <div>
                          <strong>Billed To:</strong> {msg.order.customerName || 'N/A'}
                        </div>
                        <div>
                          <strong>Phone:</strong> {msg.order.customerPhone || 'N/A'} &nbsp;|&nbsp; <strong>Email:</strong> {msg.order.customerEmail || 'N/A'}
                        </div>
                        <div style={{ borderTop: '1px dotted #ccc', paddingTop: '6px', marginTop: '4px' }}>
                          <strong>Table:</strong> {msg.order.table?.number || msg.order.table} &nbsp;|&nbsp; <strong>Time:</strong> {msg.order.time || new Date(msg.order.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className={billStyles.line}></div>
                      <table className={billStyles.billTable}>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {msg.order.items.map((item, index) => (
                            <tr key={index}>
                              <td>
                                <div>{item.name}</div>
                                {item.customization && Object.keys(item.customization).length > 0 && (
                                  <div className={billStyles.customizationTags} style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                                    {Object.entries(item.customization).map(([label, val]) => (
                                      val && (!Array.isArray(val) || val.length > 0) ? (
                                        <div key={label}>
                                          - {label}: {Array.isArray(val) ? val.join(", ") : val}
                                        </div>
                                      ) : null
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td>{item.quantity}</td>
                              <td>₹{item.price}</td>
                              <td>₹{item.price * item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className={billStyles.line}></div>
                      <div className={billStyles.summary}>
                        <p>Subtotal: ₹{msg.order.totalAmount || msg.order.total}</p>
                        <p>GST (5%): ₹{((msg.order.totalAmount || msg.order.total) * 0.05).toFixed(2)}</p>
                        <h3>Grand Total: ₹{((msg.order.totalAmount || msg.order.total) * 1.05).toFixed(2)}</h3>
                      </div>
                      <div className={billStyles.line}></div>
                      {msg.order.paymentStatus === 'paid' ? (
                        <div className={billStyles.paidBadge}>✅ PAID</div>
                      ) : (
                        <div className={styles.paymentOptions} style={{ marginTop: '10px' }}>
                          <button onClick={() => send('cash')} className={styles.payOptionBtn}>Cash</button>
                          <button onClick={handleDodoPayment} className={styles.payOptionBtn}>Online Payment</button>
                        </div>
                      )}
                      <p className={billStyles.thankyou}>Thank You! Visit Again 😊</p>
                    </div>
                  )}
                  {!msg.order && (
                    <div className={styles.paymentOptions}>
                      <button onClick={() => send('cash')} className={styles.payOptionBtn}>Cash</button>
                      <button onClick={handleDodoPayment} className={styles.payOptionBtn}>Online Payment</button>
                    </div>
                  )}
                </>
              )}

              {msg.type === 'payment_link' && (
                <div style={{ marginTop: '10px' }}>
                  <a href={msg.link} target="_blank" rel="noopener noreferrer" className={styles.orderBtn} style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
                    Pay Now 💳
                  </a>
                </div>
              )}

              {(msg.type === 'reservation_link' || msg.type === 'reservation_form') && resCompletedMsgIndex !== i && (
                <div className={styles.resFormCard}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 700, fontSize: '0.95rem', color: '#2d2d3a' }}>📅 Reserve a Table</p>
                  {resError && <div className={styles.resErrorBanner}>⚠️ {resError}</div>}
                  <div className={styles.resFormGrid}>
                    <div className={styles.resFormGroupFull}>
                      <label className={styles.resFormLabel}>Full Name *</label>
                      <input
                        type="text"
                        className={styles.resFormInput}
                        placeholder="John Doe"
                        value={resForm.customerName}
                        onChange={(e) => setResForm({ ...resForm, customerName: e.target.value })}
                      />
                    </div>

                    <div className={styles.resFormRow}>
                      <div className={styles.resFormGroup}>
                        <label className={styles.resFormLabel}>Phone *</label>
                        <input
                          type="tel"
                          className={styles.resFormInput}
                          placeholder="9876543210"
                          value={resForm.customerPhone}
                          onChange={(e) => setResForm({ ...resForm, customerPhone: e.target.value })}
                        />
                      </div>
                      <div className={styles.resFormGroup}>
                        <label className={styles.resFormLabel}>Guests *</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          className={styles.resFormInput}
                          value={resForm.partySize}
                          onChange={(e) => setResForm({ ...resForm, partySize: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className={styles.resFormRow}>
                      <div className={styles.resFormGroup}>
                        <label className={styles.resFormLabel}>Date *</label>
                        <input
                          type="date"
                          className={styles.resFormInput}
                          value={resForm.date}
                          onChange={(e) => setResForm({ ...resForm, date: e.target.value })}
                        />
                      </div>
                      <div className={styles.resFormGroup}>
                        <label className={styles.resFormLabel}>Time *</label>
                        <input
                          type="time"
                          className={styles.resFormInput}
                          value={resForm.time}
                          onChange={(e) => setResForm({ ...resForm, time: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className={styles.resFormGroupFull}>
                      <label className={styles.resFormLabel}>Seating Area</label>
                      <select
                        className={styles.resFormInput}
                        value={resForm.seatingArea}
                        onChange={(e) => setResForm({ ...resForm, seatingArea: e.target.value })}
                      >
                        <option value="Main Dining Hall">Main Dining Hall</option>
                        <option value="Rooftop Garden">Rooftop Garden</option>
                        <option value="VIP Lounge">VIP Lounge</option>
                        <option value="Outdoor Patio">Outdoor Patio</option>
                      </select>
                    </div>

                    <div className={styles.resFormGroupFull}>
                      <label className={styles.resFormLabel}>Email (Optional)</label>
                      <input
                        type="email"
                        className={styles.resFormInput}
                        placeholder="email@example.com"
                        value={resForm.customerEmail}
                        onChange={(e) => setResForm({ ...resForm, customerEmail: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.resFormSubmitBtn}
                    disabled={resSubmitting}
                    onClick={() => handleInlineReservationSubmit(i)}
                  >
                    {resSubmitting ? 'Confirming...' : 'Confirm Table Booking ✨'}
                  </button>
                </div>
              )}

              {msg.type === 'order_progress_tracker' && msg.order && (
                <div className={styles.trackerCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2d2d3a' }}>Order #{msg.order._id?.toString().slice(-4).toUpperCase()}</span>
                    {msg.order.status === 'pending' && (
                      <span style={{ background: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                        ⏳ PENDING (~{msg.estimatedMinutes || 10}m)
                      </span>
                    )}
                    {msg.order.status === 'preparing' && (
                      <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                        🍳 PREPARING (~{msg.estimatedMinutes || 5}m)
                      </span>
                    )}
                    {msg.order.status === 'ready' && (
                      <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                        🚀 READY
                      </span>
                    )}
                    {msg.order.status === 'served' && (
                      <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                        🍽️ SERVED
                      </span>
                    )}
                  </div>

                  {/* Visual Stepper */}
                  <div className={styles.trackerSteps}>
                    {[
                      { statusKey: 'pending', icon: '⏳', label: 'Received' },
                      { statusKey: 'preparing', icon: '🍳', label: 'Preparing' },
                      { statusKey: 'ready', icon: '🚀', label: 'Ready' },
                      { statusKey: 'served', icon: '🍽️', label: 'Served' }
                    ].map((step, idx) => {
                      const orderStatuses = ['pending', 'preparing', 'ready', 'served'];
                      const currentIdx = orderStatuses.indexOf(msg.order.status || 'pending');
                      const stepIdx = idx;

                      let circleClass = styles.stepIconCircle;
                      let labelClass = styles.stepLabel;

                      if (stepIdx === currentIdx) {
                        circleClass += ` ${styles.stepActiveCircle}`;
                        labelClass += ` ${styles.stepActiveLabel}`;
                      } else if (stepIdx < currentIdx) {
                        circleClass += ` ${styles.stepDoneCircle}`;
                        labelClass += ` ${styles.stepDoneLabel}`;
                      }

                      return (
                        <div key={step.statusKey} className={styles.trackerStep}>
                          <div className={circleClass}>{step.icon}</div>
                          <span className={labelClass}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Item List Summary */}
                  {msg.order.items && msg.order.items.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '6px' }}>
                      <strong>Items:</strong> {msg.order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                    </div>
                  )}

                  {msg.order.notes && (
                    <div style={{ fontSize: '0.75rem', color: '#f2994a', marginTop: '4px', fontStyle: 'italic' }}>
                      <strong>Notes:</strong> {msg.order.notes}
                    </div>
                  )}

                  {/* Add Special Cooking Notes */}
                  {!['served', 'cancelled'].includes(msg.order.status) && (
                    <div className={styles.trackerNotesSection}>
                      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#444' }}>Add Special Cooking Instructions:</p>
                      <div className={styles.noteInputRow}>
                        <input
                          type="text"
                          className={styles.noteInput}
                          placeholder="e.g. Extra spicy, no onions..."
                          value={cookingNoteText}
                          onChange={(e) => setCookingNoteText(e.target.value)}
                        />
                        <button
                          type="button"
                          className={styles.noteSubmitBtn}
                          disabled={cookingNoteSubmitting}
                          onClick={() => handleCookingNoteSubmit(msg.order._id)}
                        >
                          {cookingNoteSubmitting ? '...' : 'Add Note 📝'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {msg.type === 'feedback_prompt' && !feedbackSubmitted && (
                <div className={styles.feedbackCard}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 600, textAlign: 'center', fontSize: '0.9rem' }}>Rate your Dining Experience:</p>
                  <div className={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`${styles.starBtn} ${star <= selectedRating ? styles.starActive : ''}`}
                        onClick={() => setSelectedRating(star)}
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                  <textarea
                    className={styles.feedbackInput}
                    rows={2}
                    placeholder="Tell us what you loved or how we can improve..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.feedbackSubmitBtn}
                    onClick={handleFeedbackSubmit}
                  >
                    Submit Feedback ✨
                  </button>
                </div>
              )}

              {msg.role === "assistant" && !['payment_prompt', 'order_success', 'follow_up', 'payment_link', 'reservation_link'].includes(msg.type) && (
                <div className={styles.aiItemList}>
                  {menu.filter(item => {
                    if (msg.items && msg.items.length > 0) {
                      return msg.items.includes(String(item._id));
                    }
                    const escapedName = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    return new RegExp(`(?:^|\\W)${escapedName}(?:$|\\W)`, 'i').test(msg.text);
                  }).map((item) => {
                    const itemId = String(item._id);
                    // For the list view, we show the total quantity of this item ID in cart
                    const totalQty = pendingOrder
                      .filter(i => String(i._id) === itemId)
                      .reduce((acc, curr) => acc + curr.quantity, 0);

                    const hasOptions = Array.isArray(item.customizationOptions) && item.customizationOptions.length > 0;

                    return (
                      <div key={item._id} className={styles.aiItemRow}>
                        <div className={styles.aiItemMeta}>
                          <span className={styles.aiItemName}>{item.name} – ₹{item.price}</span>
                          {hasOptions && <span className={styles.aiCustomizablePill}>🎛️ Customizable</span>}
                        </div>
                        <div className={styles.aiQtyControls}>
                          {totalQty > 0 ? (
                            <>
                              {/* For simplicity in AI panel, "-" removes the LAST added instance of this item */}
                              <button onClick={() => {
                                const lastInstance = [...pendingOrder].reverse().find(i => String(i._id) === itemId);
                                if (lastInstance) handleUpdateQty(item, -1, lastInstance.customization);
                              }} className={styles.qtyBtn}>-</button>
                              <span className={styles.qtyNumber}>{totalQty}</span>
                              <button onClick={() => handleAddItem(item)} className={styles.qtyBtn}>+</button>
                            </>
                          ) : (
                            <button onClick={() => handleAddItem(item)} className={`${styles.addBtn} ${hasOptions ? styles.addBtnCustom : ''}`}>
                              {hasOptions ? '🎛️ Add' : 'Add'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {loading && <div className={styles.botMsg}><div className={styles.typingIndicator}><span className={styles.typingDot}></span><span className={styles.typingDot}></span><span className={styles.typingDot}></span></div></div>}
          <div ref={bottomRef} />
        </div>

        {customizeTarget && (
          <div className={styles.custPanel}>
            <div className={styles.custPanelHeader}>
              <div>
                <p className={styles.custPanelTitle}>🎛️ Customize</p>
                <p className={styles.custPanelSub}>{customizeTarget.name} · ₹{customizeTarget.price}</p>
              </div>
              <button className={styles.custPanelClose} onClick={() => setCustomizeTarget(null)}>✕</button>
            </div>
            {custError && <div className={styles.custErrorBanner}>⚠️ {custError}</div>}
            <div className={styles.custPanelBody}>
              {customizeTarget.customizationOptions.map((opt, oi) => (
                <div key={oi} className={styles.custOptGroup}>
                  <p className={styles.custOptLabel}>{opt.label}{opt.required && <span className={styles.custOptRequired}> *</span>}</p>
                  {opt.type === 'select' && (
                    <div className={styles.custPills}>
                      {opt.choices.map((choice, ci) => {
                        const choiceName = getChoiceName(choice);
                        const choicePrice = getChoicePrice(choice);
                        return (
                          <button key={ci} type="button" className={`${styles.custPill} ${custValues[opt.label] === choiceName ? styles.custPillActive : ''}`}
                            onClick={() => setCustValues(v => ({ ...v, [opt.label]: choiceName }))}>
                            {choiceName} {choicePrice ? `(+₹${choicePrice})` : ''}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {opt.type === 'checkbox' && (
                    <div className={styles.custPills}>
                      {opt.choices.map((choice, ci) => {
                        const choiceName = getChoiceName(choice);
                        const choicePrice = getChoicePrice(choice);
                        const checked = (custValues[opt.label] || []).includes(choiceName);
                        return <button key={ci} type="button" className={`${styles.custPill} ${checked ? styles.custPillActive : ''}`}
                          onClick={() => handleCheckboxChange(opt.label, choiceName, !checked)}>
                          {checked ? '✓ ' : ''}{choiceName} {choicePrice ? `(+₹${choicePrice})` : ''}
                        </button>;
                      })}
                    </div>
                  )}
                  {opt.type === 'text' && (
                    <textarea className={styles.custTextarea} placeholder="Special requests..." rows={2} value={custValues[opt.label] || ''}
                      onChange={e => setCustValues(v => ({ ...v, [opt.label]: e.target.value }))} />
                  )}
                </div>
              ))}

              {/* Additional generic custom text instructions */}
              <div className={styles.custOptGroup}>
                <p className={styles.custOptLabel}>Additional Instructions (Optional)</p>
                <textarea
                  className={styles.custTextarea}
                  placeholder="E.g., no onions, extra garlic, less salt..."
                  rows={2}
                  value={custValues['Additional Instructions'] || ''}
                  onChange={e => setCustValues(v => ({ ...v, 'Additional Instructions': e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.custPanelFooter}>
              <button className={styles.custCancelBtn} onClick={() => setCustomizeTarget(null)}>Cancel</button>
              <button className={styles.custConfirmBtn} onClick={confirmCustomization}>Add to Order</button>
            </div>
          </div>
        )}

        {pendingOrder.length > 0 && !customizeTarget && (
          <div className={styles.cartFooter}>
            <div className={styles.cartItemsSummary}>
              {pendingOrder.map((item, idx) => (
                <div key={idx} className={styles.cartSummaryRow}>
                  <span className={styles.cartSummaryName}>{item.name} ×{item.quantity} (₹{getItemTotalPrice(item, item.customization) * item.quantity})</span>
                  {item.customization && Object.keys(item.customization).length > 0 && (
                    <div className={styles.cartSummaryTags}>
                      {Object.entries(item.customization).map(([k, v]) =>
                        (v && (!Array.isArray(v) || v.length > 0)) ? <span key={k} className={styles.cartSummaryTag}>{k}: {Array.isArray(v) ? v.join(', ') : v}</span> : null
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.etaBadge}>⏳ Estimated Wait: <strong>~{eta} mins</strong></div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                type="text"
                placeholder="Full Name (Optional)"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', background: '#FAF6F0', color: '#1a1a24', outline: 'none', fontSize: '0.85rem' }}
              />
              <input
                type="email"
                placeholder="Email Address (Optional)"
                value={customerEmail}
                onChange={e => handleEmailChange(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', background: '#FAF6F0', color: '#1a1a24', outline: 'none', fontSize: '0.85rem' }}
              />
            </div>

            {customerEmail && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={otpLoading}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--accent, #e8b86d)',
                      color: '#0f0f14',
                      fontSize: '0.8rem',
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
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', background: '#FAF6F0', color: '#1a1a24', outline: 'none', fontSize: '0.85rem' }}
                    />
                  )}
                </div>
                {otpError && (
                  <span style={{ fontSize: '0.75rem', color: '#ff5252', fontWeight: 'bold' }}>⚠️ {otpError}</span>
                )}
                {otpSent && !otpCode && !otpError && (
                  <span style={{ fontSize: '0.75rem', color: '#4caf50' }}>OTP code sent to {customerEmail}.</span>
                )}
              </div>
            )}

            <button
              className={styles.orderBtn}
              onClick={submitOrder}
              disabled={loading || (customerEmail && !otpCode)}
              style={{
                marginTop: '12px',
                opacity: (loading || (customerEmail && !otpCode)) ? 0.65 : 1,
                cursor: (loading || (customerEmail && !otpCode)) ? 'not-allowed' : 'pointer'
              }}
            >
              {customerEmail && !otpCode
                ? '🔒 Verify OTP to Order'
                : `Place Order (₹${pendingOrder.reduce((acc, curr) => acc + (getItemTotalPrice(curr, curr.customization) * curr.quantity), 0)})`}
            </button>
          </div>
        )}

        <div className={styles.inputRow}>
          {recognitionRef.current && (
            <button
              onClick={toggleListening}
              className={`${styles.micBtn} ${isListening ? styles.listening : ''}`}
              title={isListening ? "Listening... Click to stop" : "Speak to AI"}
            >
              {isListening ? '🛑' : '🎙️'}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={isListening ? "Listening..." : "Ask me anything..."}
            className={styles.input}
          />
          <button onClick={() => send()} className={styles.sendBtn} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  );
}