const axios = require('axios');

async function run() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@restaurant.com',
      password: 'password123'
    }).catch(e => {
        return axios.post('http://localhost:5000/api/auth/login', {
          email: 'admin@restaurant.com',
          password: 'password'
        })
    });
    const token = loginRes.data.token;
    console.log("Got token");

    const tableRes = await axios.get('http://localhost:5000/api/tables');
    const tableId = tableRes.data[0]._id;

    const menuRes = await axios.get('http://localhost:5000/api/menu');
    const menuItemId = menuRes.data[0]._id;

    console.log("Mocking payload...");
    const payload = {
        table: tableId,
        items: [{ menuItem: menuItemId, quantity: 1 }],
        paymentStatus: 'pending',
        paymentMethod: 'pending',
        orderType: 'manual'
    };

    const orderRes = await axios.post('http://localhost:5000/api/orders', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("SUCCESS:", orderRes.data._id);
  } catch (err) {
    console.error("FAILED:", err.response?.data || err.message);
  }
}
run();
