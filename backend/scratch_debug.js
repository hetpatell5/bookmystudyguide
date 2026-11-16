const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/bmsg').then(async () => {
    const db = mongoose.connection.db;
    const prod = await db.collection('products').findOne({ title: { $regex: 'BECS 144', $options: 'i' } });
    if (!prod) {
        console.log('Not found');
        process.exit(1);
    }
    const fs = require('fs');
    fs.writeFileSync('debug_desc.json', JSON.stringify(prod.description));
    console.log('Wrote to debug_desc.json');
    process.exit(0);
}).catch(e => {
    console.log(e);
    process.exit(1);
});
