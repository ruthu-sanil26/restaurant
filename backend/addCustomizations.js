const mongoose = require('mongoose');
require('dotenv').config();

const MenuItem = require('./models/MenuItem');
const Category = require('./models/Category');

const drinkCustomizations = [
  { label: 'Sugar Level', type: 'select', choices: ['0%', '25%', '50%', '100%'], required: true },
  { label: 'Ice Level', type: 'select', choices: ['No Ice', 'Less Ice', 'Regular'], required: true },
  { label: 'Toppings', type: 'checkbox', choices: ['Boba', 'Extra Chips', 'Whipped Cream'], required: false }
];

const pizzaBurgerCustomizations = [
  { label: 'Crust/Bun Type', type: 'select', choices: ['Thin Crust/Whole Wheat', 'Cheese Burst/Brioche', 'Pan'], required: true },
  { label: 'Add-On Veggies', type: 'checkbox', choices: ['Jalapenos', 'Olives', 'Mushrooms'], required: false },
  { label: 'Extra Sauces', type: 'checkbox', choices: ['Mayo', 'BBQ', 'Garlic Dip'], required: false }
];

const mainCourseCustomizations = [
  { label: 'Spice Level', type: 'select', choices: ['Mild', 'Medium', 'Extra Spicy'], required: true },
  { label: 'Portion Size', type: 'select', choices: ['Half', 'Regular', 'Family'], required: true },
  { label: 'Dietary/Allergies', type: 'text', choices: [], required: false }
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant');
    console.log('Connected to DB');

    const items = await MenuItem.find().lean();
    
    let count = 0;
    for (const item of items) {
      const catName = String(item.category || '').toLowerCase();
      const name = item.name.toLowerCase();

      let targetOpts = [];

      if (catName.includes('beverage') || catName.includes('drink') || name.includes('juice') || name.includes('shake') || name.includes('smoothie')) {
        targetOpts = drinkCustomizations;
      } 
      else if (catName.includes('pizza') || catName.includes('burger') || name.includes('pizza') || name.includes('burger')) {
        targetOpts = pizzaBurgerCustomizations;
      }
      else if (catName.includes('main') || catName.includes('curry') || catName.includes('thali') || name.includes('chicken') || name.includes('biryani')) {
        targetOpts = mainCourseCustomizations;
      }

      if (targetOpts.length > 0) {
        await MenuItem.updateOne({ _id: item._id }, { $set: { customizationOptions: targetOpts } });
        console.log(`Updated: ${item.name} with ${targetOpts[0].label} options`);
        count++;
      }
    }

    console.log(`Successfully updated ${count} menu items with example customizations!`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
