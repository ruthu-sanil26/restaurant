async function run() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@restaurant.com', password: 'password123' })
    }).then(r => r.json());

    const token = loginRes.token;

    if (!token) {
        console.log("No token, login response:", loginRes);
        const loginRes2 = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@restaurant.com', password: 'password' })
        }).then(r => r.json());
        if (!loginRes2.token) {
           console.log("Login failed");
           process.exit(1);
        }
    }

    const t = token || loginRes2.token;

    const tableRes = await fetch('http://localhost:5000/api/tables', {
       headers: { Authorization: `Bearer ${t}` }
    }).then(r => r.json());

    const tableId = tableRes[0]._id;

    const menuRes = await fetch('http://localhost:5000/api/menu').then(r => r.json());
    const menuItemId = menuRes[0].items ? menuRes[0].items[0]._id : menuRes[0]._id; // depends on format

    console.log("Mocking payload...");
    const payload = {
        table: tableId,
        items: [{ menuItem: menuItemId, quantity: 1 }],
        paymentStatus: 'pending',
        paymentMethod: 'pending',
        orderType: 'manual'
    };

    const orderRes = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(payload)
    });

    const body = await orderRes.json();
    if (!orderRes.ok) {
       throw new Error(JSON.stringify(body));
    }
    console.log("SUCCESS:", body._id);
  } catch (err) {
    console.error("FAILED:", err);
  }
}
run();
