const mongoose = require('mongoose');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/restaurant');
  const MenuItem = require('./models/MenuItem');
  const item = await MenuItem.findOne({ name: 'Baby Corn Chilly' });
  if (item) {
    console.log(item.name);
    console.log(JSON.stringify(item.customizationOptions, null, 2));
  } else {
    console.log("NOT FOUND");
  }
  process.exit(0);
})();
