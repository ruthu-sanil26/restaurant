const mongoose = require('mongoose');
require('dotenv').config();
const MenuItem = require('./models/MenuItem');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant');
    console.log('Connected to DB');

    // Mongoose cast checks might fail dynamically, so we use lean + updateOne
    const items = await MenuItem.find().lean();
    
    let count = 0;
    for (const item of items) {
      if (!Array.isArray(item.customizationOptions) || item.customizationOptions.length === 0) continue;

      let modified = false;
      const newOptions = item.customizationOptions.map(opt => {
        if (!opt.choices) return opt;
        
        const migChoices = opt.choices.map(c => {
          if (typeof c === 'string') {
            modified = true;
            return { name: c, extraPrice: 0 };
          }
          if (c && typeof c === 'object' && c.name) {
            return c; // already migrated
          }
          modified = true;
          return { name: String(c), extraPrice: 0 };
        });

        return { ...opt, choices: migChoices };
      });

      if (modified) {
        await MenuItem.updateOne(
          { _id: item._id },
          { $set: { customizationOptions: newOptions } }
        );
        console.log(`Migrated ${item.name}`);
        count++;
      }
    }

    console.log(`Migration complete! Successfully migrated ${count} items.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
