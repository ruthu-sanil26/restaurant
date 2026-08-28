import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Cart.module.css";

function Cart() {

  const [cart,setCart] = useState([]);
  const [table,setTable] = useState("");

  const navigate = useNavigate();

  useEffect(()=>{

    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];

    const updatedCart = storedCart.map(item => ({
      ...item,
      quantity: item.quantity || 1
    }));

    setCart(updatedCart);

    if(updatedCart.length > 0){
      setTable(updatedCart[0].table);
    }

    localStorage.setItem("cart",JSON.stringify(updatedCart));

  },[]);

  const updateCart = (updatedCart)=>{
    setCart(updatedCart);
    localStorage.setItem("cart",JSON.stringify(updatedCart));
  };

  const increaseQty = (index)=>{
    const updatedCart = [...cart];
    updatedCart[index].quantity += 1;
    updateCart(updatedCart);
  };

  const decreaseQty = (index)=>{
    const updatedCart = [...cart];

    if(updatedCart[index].quantity > 1){
      updatedCart[index].quantity -= 1;
    } else {
      updatedCart.splice(index,1);
    }

    updateCart(updatedCart);
  };

  const removeItem = (index)=>{
    const updatedCart = [...cart];
    updatedCart.splice(index,1);
    updateCart(updatedCart);
  };

  const total = cart.reduce(
    (sum,item)=> sum + item.price * item.quantity,0
  );

  const placeOrder = () => {

    if(cart.length === 0){
      alert("Cart is empty!");
      return;
    }

    const orders = JSON.parse(localStorage.getItem("orders")) || [];

    const newOrder = {
      table: table,
      items: cart,
      total: total,
      status: "Pending",
      time: new Date().toLocaleTimeString()
    };

    orders.push(newOrder);

    localStorage.setItem("orders", JSON.stringify(orders));

    // ⭐ Save bill for Bill page
    localStorage.setItem("bill", JSON.stringify(newOrder));

    localStorage.removeItem("cart");

    alert("Order placed successfully!");

    setCart([]);

    // ⭐ Navigate to Bill page
    navigate("/bill");
  };

  return(
    <div className={styles.cartContainer}>

      <h1 className={styles.cartTitle}>Your Cart</h1>

      <h3 className={styles.tableNumber}>Table: {table}</h3>

      <div className={styles.cartList}>

        {cart.map((item,index)=>(
          <div key={index} className={styles.cartItem}>

            <img src={item.img} alt={item.name} className={styles.cartImg}/>

            <div className={styles.cartDetails}>
              <div className={styles.cartName}>{item.name}</div>
              <div className={styles.cartPrice}>₹{item.price}</div>

              <div className={styles.qtyBox}>
                <button onClick={()=>decreaseQty(index)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={()=>increaseQty(index)}>+</button>
              </div>
            </div>

            <button
              className={styles.removeBtn}
              onClick={()=>removeItem(index)}
            >
              Remove
            </button>

          </div>
        ))}

      </div>

      <div className={styles.cartTotal}>
        Total: ₹{total}
      </div>

      <button 
        className={styles.checkoutBtn}
        onClick={placeOrder}
      >
        Place Order
      </button>

    </div>
  );
}

export default Cart;