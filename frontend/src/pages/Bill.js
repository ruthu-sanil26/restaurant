import React, { useEffect, useState } from "react";
import styles from "./Bill.module.css";
import api from "../services/api";

function Bill(){

  const [bill,setBill] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');

  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    const fetchBillStatus = async () => {
      let data = JSON.parse(localStorage.getItem("bill"));
      if (!data) {
        data = JSON.parse(localStorage.getItem("last_paid_bill"));
      }
      if (!data) return;

      // Optimistically show stored bill first
      setBill(data);
      if (data.paymentStatus === 'paid') {
        setPaymentStatus('paid');
      }

      try {
        const tableId = data._tableId || (data.table && (typeof data.table === 'object' ? data.table?._id : data.table));
        if (tableId) {
          try {
            // Try fetching merged unpaid orders for this table first
            const res = await api.get(`/public/tables/${tableId}/orders`);
            setPaymentStatus(res.data.paymentStatus);
            setBill(res.data);
            if (res.data.paymentStatus === 'paid') {
              sessionStorage.removeItem(`ai_chat_${tableId}`);
              localStorage.setItem("last_paid_bill", JSON.stringify({ ...res.data, _tableId: tableId }));
              localStorage.removeItem("bill");
              localStorage.removeItem("cart");
              localStorage.removeItem("orders");
            }
            return; // Successfully displayed active merged bill
          } catch (mergedErr) {
            console.log("Merged fetch failed (likely already paid or no active orders), falling back to single order status", mergedErr);
          }
        }

        // Fallback: Fetch only the specific current order
        if (data._id) {
          const res = await api.get(`/public/orders/${data._id}`);
          setPaymentStatus(res.data.paymentStatus);
          setBill(res.data);
          if (res.data.paymentStatus === 'paid') {
            const tId = data._tableId || (typeof res.data.table === 'object' ? res.data.table?._id : res.data.table);
            if (tId) {
              sessionStorage.removeItem(`ai_chat_${tId}`);
              localStorage.setItem("last_paid_bill", JSON.stringify({ ...res.data, _tableId: tId }));
            }
            localStorage.removeItem("bill");
            localStorage.removeItem("cart");
            localStorage.removeItem("orders");
          }
        }
      } catch (err) {
        console.error("Failed to fetch latest bill status", err);
      }
    };
    fetchBillStatus();
  }, []);

  if (!bill) {
    return <h2>No Bill Available</h2>;
  }

  // Calculate using totalAmount (backend) or total (legacy frontend)
  const subTotal = parseFloat(bill.totalAmount || bill.total || 0);

  const handleDodoPayment = async () => {
    if (!bill) return;
    setLoadingPayment(true);
    try {
      const returnUrl = window.location.href;
      const res = await api.post(`/public/orders/${bill._id}/dodo-checkout`, { returnUrl });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        alert("Payment URL not returned");
        setLoadingPayment(false);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to initiate payment");
      setLoadingPayment(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!bill?._id) return;
    try {
      await api.post(`/public/orders/${bill._id}/feedback`, {
        rating,
        feedback: feedbackText,
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    }
  };

  const gst = (subTotal * 0.05).toFixed(2);
  const grandTotal = (subTotal + parseFloat(gst)).toFixed(2);

  return(

    <div className={styles.billPage}>

      <div className={styles.receipt}>

        <h2 className={styles.restaurant}>Royal Rasoi</h2>
        <p className={styles.address}>Udupi, Karnataka</p>
        <p className={styles.address}>Ph: +91 98765 43210</p>

        <div className={styles.line}></div>

        <div style={{ textAlign: "left", marginBottom: "12px", fontSize: "0.9rem", display: 'flex', flexDirection: 'column', gap: '6px', color: '#1a1a1a' }}>
          <div>
            <strong>Billed To:</strong> {bill.customerName || 'N/A'}
          </div>
          <div>
            <strong>Phone:</strong> {bill.customerPhone || 'N/A'}
          </div>
          <div style={{ borderTop: '1px dotted #ccc', paddingTop: '6px', marginTop: '4px' }}>
            <strong>Table:</strong> {bill.table?.number || bill.table} &nbsp;|&nbsp; <strong>Time:</strong> {bill.time || new Date(bill.createdAt).toLocaleTimeString()}
          </div>
        </div>

        <div className={styles.line}></div>

        <table className={styles.billTable}>

          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {bill.items.map((item,index)=>(
              <tr key={index}>
                <td>
                  <div>{item.name}</div>
                  {item.customization && Object.keys(item.customization).length > 0 && (
                    <div className={styles.customizationTags} style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
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

        <div className={styles.line}></div>

        <div className={styles.summary}>
          <p>Subtotal: ₹{subTotal.toFixed(2)}</p>
          <p>GST (5%): ₹{gst}</p>
          <h3>Grand Total: ₹{grandTotal}</h3>
        </div>

        <div className={styles.line}></div>

        {paymentStatus === 'paid' ? (
          <div>
            <div className={styles.paidBadge}>
              ✅ PAID
            </div>
            {!feedbackSubmitted ? (
              <div style={{ marginTop: '16px', padding: '12px', background: '#f9f6f0', borderRadius: '12px', textAlign: 'center', border: '1px solid #eee' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>How was your experience today?</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '10px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.8rem',
                        cursor: 'pointer',
                        opacity: star <= rating ? 1 : 0.3,
                        transform: star <= rating ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <textarea
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '0.85rem',
                    marginBottom: '10px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  rows={2}
                  placeholder="Optional comments..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#f2994a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Submit Feedback ✨
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '14px', padding: '10px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '10px', fontWeight: 'bold', textAlign: 'center', fontSize: '0.9rem' }}>
                ⭐ Thank you for your feedback! Have a great day!
              </div>
            )}
          </div>
        ) : (
          <button 
            className={styles.dodoPayBtn} 
            onClick={handleDodoPayment} 
            disabled={loadingPayment}
          >
            {loadingPayment ? "Processing..." : "Pay with Dodo Payments"}
          </button>
        )}

        <p className={styles.thankyou}>Thank You! Visit Again 😊</p>

      </div>

    </div>

  );
}

export default Bill;