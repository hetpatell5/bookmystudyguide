const fs = require('fs');
const path = require('path');

const filesToClean = [
    "src/user/page/shipping/shipping.jsx",
    "src/user/page/profile/profile.jsx",
    "src/user/page/myorders/MyOrder.jsx",   
    "src/user/page/home/home.jsx",
    "src/user/page/degree page/maindegree/question bank/quetion.jsx",
    "src/user/page/degree page/maindegree/ai not/ai.jsx",
    "src/user/page/contect/contect.jsx",
    "src/user/page/comboproduct/comboproduct.jsx",
    "src/user/page/checkout/Checkout.jsx",
    "src/user/page/cart/Cart.jsx",
    "src/user/page/about/about.jsx",
    "src/user/componets/ComboDetail/ComboDetail.jsx"
];

filesToClean.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');

        content = content.replace(/^.*import\s+Header\s+from.*$/gm, '');
        content = content.replace(/^.*import\s+Footer\s+from.*$/gm, '');

        content = content.replace(/<Header\s*\/?>(<\/Header>)?/g, '');
        content = content.replace(/<Footer\s*\/?>(<\/Footer>)?/g, '');

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Cleaned: ${file}`);
    } else {
        console.log(`Not found: ${file}`);
    }
});