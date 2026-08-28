const mongoose = require('mongoose');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/restaurant');
  const MenuItem = require('./models/MenuItem');
  const items = await MenuItem.find({}, {name: 1, customizationOptions: 1});
  items.forEach(item => {
    if (item.customizationOptions && item.customizationOptions.length > 0) {
      console.log(`[HAS CUSTOM] ${item.name}`);
      console.log(JSON.stringify(item.customizationOptions, null, 2));
    }
  });
  console.log("Total items:", items.length);
  process.exit(0);
})();
