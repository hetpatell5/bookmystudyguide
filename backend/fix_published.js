require('dotenv').config();
const { MainDegree, SubDegree, Subject, Book } = require('./model/mysql');
const { sequelize } = require('./config/mysqlDb');

(async () => {
  try {
    await MainDegree.update({ isPublished: true }, { where: {} });
    await SubDegree.update({ isPublished: true }, { where: {} });
    await Subject.update({ isPublished: true }, { where: {} });
    await Book.update({ isPublished: true }, { where: {} });
    console.log('✅ All existing classifications set to published');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
