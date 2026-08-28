const DodoPayments = require('dodopayments');

async function setup() {
  const dodoClient = new DodoPayments({ 
    bearerToken: '2FejcqPDMN016dwJ.ZWbI_GyDB3tmsM4NnmqtlEdZEx47P56RPe3TYfHcRK7jc6qu', 
    environment: 'test_mode' 
  });
  
  try {
    const products = await dodoClient.products.list();
    console.log("Existing Products:", JSON.stringify(products, null, 2));
  } catch (err) {
    console.error("Error connecting to Dodo Payments:", err);
  }
}

setup();
