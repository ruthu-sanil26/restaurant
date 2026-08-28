const mongoose = require('mongoose');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/restaurant_db');
  const MenuItem = require('./models/MenuItem');
  const items = await MenuItem.find({'customizationOptions': {$exists: true}});
  
  for (let item of items) {
    if (!item.customizationOptions || item.customizationOptions.length === 0) continue;
    let modified = false;
    item.customizationOptions.forEach(opt => {
      // Look for the bug where the choices are split chars
      if (opt.choices && opt.choices.length > 0) {
        let isCorrupted = false;
        let fixedChoices = opt.choices.map(c => {
          let cObj = c.toJSON ? c.toJSON() : c;
          if (cObj['0'] !== undefined) {
             isCorrupted = true;
             const keys = Object.keys(cObj).filter(k => /^\\d+$/.test(k)).sort((a,b)=>Number(a)-Number(b));
             const name = keys.map(k=>cObj[k]).join('');
             return { name, extraPrice: cObj.extraPrice || 0 };
          }
          return cObj;
        });

        if (isCorrupted) {
          opt.choices = fixedChoices;
          modified = true;
        }
      }

      // If user wants ALL choices to be "select" instead of "checkbox", let's fix it.
      if (opt.type === 'checkbox') {
        opt.type = 'select';
        modified = true;
        console.log(`Changed ${opt.label} on ${item.name} to single-select.`);
      }
    });

    if (modified) {
      // Because we bypass mongoose bug, let's use direct collection update
      await MenuItem.collection.updateOne(
        { _id: item._id },
        { $set: { customizationOptions: item.customizationOptions } }
      );
      console.log(`Updated customized options for ${item.name}`);
    }
  }
  process.exit(0);
})();
