const mongoose = require('mongoose');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/restaurant');
  const MenuItem = require('./backend/models/MenuItem');
  const items = await MenuItem.find({ 'customizationOptions.0': { $exists: true } });
  
  for (let item of items) {
    console.log(item.name);
    console.log(JSON.stringify(item.customizationOptions, null, 2));
  }
  process.exit(0);
})();
