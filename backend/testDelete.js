(async () => {
  try {
    // 1. Get token
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    
    // 2. Get orders
    const getRes = await fetch('http://localhost:5000/api/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orders = await getRes.json();
    
    if (!orders || orders.length === 0) {
      console.log('No orders to delete!');
      return;
    }
    
    // 3. Delete the first order
    const orderToDel = orders[0];
    console.log(`Attempting to delete order: ${orderToDel._id}`);
    
    const delRes = await fetch(`http://localhost:5000/api/orders/${orderToDel._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (delRes.ok) {
      console.log('Delete successful:', await delRes.json());
    } else {
      console.error('Delete failed:', await delRes.text());
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
})();
