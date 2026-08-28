const mongoose = require('mongoose');
const Order = require('./models/Order');
const Table = require('./models/Table');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurant', {}).then(async () => {
  const table = await Table.findOne();
  console.log("Table ID:", table._id);

  const http = require('http');

  const options = {
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/public/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('Response:', res.statusCode, data);
      mongoose.connection.close();
    });
  });

  req.on('error', (e) => console.error(e));

  req.write(JSON.stringify({
    table: table._id,
    items: []
  }));
  req.end();

});
