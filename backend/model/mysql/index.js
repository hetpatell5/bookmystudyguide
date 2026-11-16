const MainDegree = require("./MainDegree");
const SubDegree = require("./SubDegree");
const Subject = require("./Subject");
const Book = require("./Book");
const Product = require("./Product");
const ProductLink = require("./ProductLink");
const Language = require("./Language");
const User = require("./User");
const EmailTemplate = require("./EmailTemplate");
const Year = require("./Year");
const Semester = require("./Semester");
const Course = require("./Course");
const FAQ = require("./FAQ");
const Subscriber = require("./Subscriber");
const Contact = require("./Contact");
const Blog = require("./Blog");
const Advertisement = require("./Advertisement");
const Config = require("./Config");
const AIConfig = require("./AIConfig");
const Admin = require("./Admin");
const OrderEmailTemplate = require("./OrderEmailTemplate");
const Cart = require("./Cart");
const Wishlist = require("./Wishlist");
const Order = require("./Order");
const OrderItem = require("./OrderItem");
const Coupon = require("./Coupon");
const Review = require("./Review");
const Feedback = require("./Feedback");
const ComboProduct = require("./ComboProduct");
const ComboItem = require("./ComboItem");
const SoftCopy = require("./SoftCopy");
const Synopsis = require("./Synopsis");
const IgnouCard = require("./IgnouCard");
const Service = require("./Service");
const Knowledge = require("./Knowledge");
const Project = require("./Project");
const AssignmentInquiry = require("./AssignmentInquiry");
const ProjectInquiry = require("./ProjectInquiry");
const FeaturedSection = require("./FeaturedSection");

const { sequelize } = require("../../config/mysqlDb");
const { ensureDefaultEmailTemplates } = require("../../utils/defaultEmailTemplates");

// Associations
MainDegree.hasMany(SubDegree, { foreignKey: "mainDegreeId", onDelete: "CASCADE" });
SubDegree.belongsTo(MainDegree, { foreignKey: "mainDegreeId" });

MainDegree.hasMany(Subject, { foreignKey: "mainDegreeId", onDelete: "CASCADE" });
Subject.belongsTo(MainDegree, { foreignKey: "mainDegreeId" });

SubDegree.hasMany(Subject, { foreignKey: "subDegreeId", onDelete: "CASCADE" });
Subject.belongsTo(SubDegree, { foreignKey: "subDegreeId" });

// Product Associations
Book.hasMany(Product, { foreignKey: "bookId" });
Product.belongsTo(Book, { foreignKey: "bookId" });

MainDegree.hasMany(Product, { foreignKey: "mainDegreeId" });
Product.belongsTo(MainDegree, { foreignKey: "mainDegreeId" });

SubDegree.hasMany(Product, { foreignKey: "subDegreeId" });
Product.belongsTo(SubDegree, { foreignKey: "subDegreeId" });

Subject.hasMany(Product, { foreignKey: "subjectId" });
Product.belongsTo(Subject, { foreignKey: "subjectId" });

Language.hasMany(Product, { foreignKey: "languageId" });
Product.belongsTo(Language, { foreignKey: "languageId" });

Product.hasMany(ProductLink, { foreignKey: "productId", onDelete: "CASCADE" });
ProductLink.belongsTo(Product, { foreignKey: "productId" });

ComboProduct.hasMany(ProductLink, { foreignKey: "comboProductId", onDelete: "CASCADE" });
ProductLink.belongsTo(ComboProduct, { foreignKey: "comboProductId" });

// Cart and Wishlist Associations
User.hasMany(Cart, { foreignKey: "userId", onDelete: "CASCADE" });
Cart.belongsTo(User, { foreignKey: "userId" });
// Cart.productId is polymorphic (book, combo, or synopsis id per itemKind) — no hard FK to Products

User.hasMany(Wishlist, { foreignKey: "userId", onDelete: "CASCADE" });
Wishlist.belongsTo(User, { foreignKey: "userId" });
Product.hasMany(Wishlist, { foreignKey: "productId", onDelete: "CASCADE" });
Wishlist.belongsTo(Product, { foreignKey: "productId" });

// Order Associations
User.hasMany(Order, { foreignKey: "userId" });
Order.belongsTo(User, { foreignKey: "userId" });
Order.hasMany(OrderItem, { foreignKey: "orderId", onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: "orderId" });
OrderItem.belongsTo(Product, { foreignKey: "productId", as: "Product" });

// Review Associations
User.hasMany(Review, { foreignKey: "userId" });
Review.belongsTo(User, { foreignKey: "userId" });
Product.hasMany(Review, { foreignKey: "productId", onDelete: "CASCADE" });
Review.belongsTo(Product, { foreignKey: "productId" });

// ComboProduct Associations
ComboProduct.hasMany(ComboItem, { foreignKey: "comboProductId", onDelete: "CASCADE", as: "items" });
ComboItem.belongsTo(ComboProduct, { foreignKey: "comboProductId" });
Product.hasMany(ComboItem, { foreignKey: "productId" });
ComboItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

MainDegree.hasMany(ComboProduct, { foreignKey: "mainDegreeId" });
ComboProduct.belongsTo(MainDegree, { foreignKey: "mainDegreeId", as: "mainDegree" });
SubDegree.hasMany(ComboProduct, { foreignKey: "subDegreeId" });
ComboProduct.belongsTo(SubDegree, { foreignKey: "subDegreeId", as: "subDegree" });

// Synopsis Associations
MainDegree.hasMany(Synopsis, { foreignKey: "mainDegreeId", onDelete: "SET NULL" });
Synopsis.belongsTo(MainDegree, { foreignKey: "mainDegreeId" });
SubDegree.hasMany(Synopsis, { foreignKey: "subDegreeId", onDelete: "SET NULL" });
Synopsis.belongsTo(SubDegree, { foreignKey: "subDegreeId" });
Subject.hasMany(Synopsis, { foreignKey: "subjectId", onDelete: "SET NULL" });
Synopsis.belongsTo(Subject, { foreignKey: "subjectId" });

// FeaturedSection Associations
// Removed FeaturedSection associations since they use array columns now

const syncMySQL = async () => {
  try {
    // Use plain sync() to create missing tables without altering existing ones.
    // Individual models that need new columns use raw SQL migrations below
    // to avoid MySQL's 64-key limit that breaks alter:true on large tables.
    await sequelize.sync();
    await FeaturedSection.sync({ alter: true }); // Must run before Product.sync (which may throw 64-key error)
    // await Product.sync({ alter: true }); // Avoid rebuilding 70MB Products table on every restart
    await Advertisement.sync({ alter: true });
    // Sync classification models to add isPublished column
    await MainDegree.sync({ alter: true });
    await SubDegree.sync({ alter: true });
    await Subject.sync({ alter: true });
    await Book.sync({ alter: true });
    await Coupon.sync({ alter: true });
    await Project.sync({ alter: true });
    await Synopsis.sync({ alter: true });
    await AssignmentInquiry.sync({ alter: true });
    await ProjectInquiry.sync({ alter: true });
    await Review.sync({ alter: true });
    await Service.sync({ alter: true });
    console.log("✅ MySQL Tables Synced Successfully (Safe Sync)");
  } catch (error) {
    console.error("❌ MySQL Sync Error:", error.message);
  }

  // ── Raw SQL column migrations for Orders ──────────────────────────────────
  // These run independently so a single missing column never blocks startup.
  const orderColumnMigrations = [
    {
      column: "status",
      sql: "ALTER TABLE `Orders` ADD COLUMN `status` VARCHAR(255) NOT NULL DEFAULT 'Pending';",
    },
    {
      column: "sku",
      table: "OrderItems",
      sql: "ALTER TABLE `OrderItems` ADD COLUMN `sku` VARCHAR(255) NULL;",
    },
  ];

  for (const m of orderColumnMigrations) {
    const tableName = m.table || "Orders";
    try {
      const [cols] = await sequelize.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${m.column}';`
      );
      if (cols.length === 0) {
        await sequelize.query(m.sql);
        console.log(`✅ ${tableName}.${m.column} column added`);
      } else {
        console.log(`✅ ${tableName}.${m.column} column already exists`);
      }
    } catch (colErr) {
      console.warn(`⚠️ ${tableName}.${m.column} migration:`, colErr.message);
    }
  }

  // ── FeaturedSections table migration ─────────────────────────────────────
  // Creates the table via raw SQL to avoid MySQL 64-key limit issue
  try {
    // Drop table to migrate from singular IDs to array IDs (since feature is brand new)
    await sequelize.query(`DROP TABLE IF EXISTS \`FeaturedSections\`;`);
    await sequelize.query(`
      CREATE TABLE \`FeaturedSections\` (
        \`id\`             CHAR(36) NOT NULL DEFAULT (UUID()),
        \`title\`          VARCHAR(255) NOT NULL,
        \`subtitle\`       VARCHAR(255) NULL,
        \`mainDegreeIds\`  TEXT NULL,
        \`subDegreeIds\`   TEXT NULL,
        \`bookTypeOrder\`  TEXT NULL,
        \`isActive\`       TINYINT(1) NOT NULL DEFAULT 1,
        \`order\`          INT NOT NULL DEFAULT 0,
        \`createdAt\`      DATETIME NOT NULL,
        \`updatedAt\`      DATETIME NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ FeaturedSections table ready");
  } catch (fsErr) {
    console.warn("⚠️ FeaturedSections table migration:", fsErr.message);
  }



  try {
    const result = await ensureDefaultEmailTemplates(EmailTemplate);
    if (result.created.length > 0) {
      console.log(`Default email templates added: ${result.created.join(", ")}`);
    } else {
      console.log("Default email templates already available");
    }
  } catch (templateErr) {
    console.warn("Default email template seed:", templateErr.message);
  }
};

module.exports = {
  MainDegree,
  SubDegree,
  Subject,
  Book,
  Product,
  ProductLink,
  Language,
  User,
  EmailTemplate,
  Year,
  Semester,
  Course,
  FAQ,
  Subscriber,
  Contact,
  Blog,
  Advertisement,
  Config,
  AIConfig,
  Admin,
  OrderEmailTemplate,
  Cart,
  Wishlist,
  Order,
  OrderItem,
  Coupon,
  Review,
  Feedback,
  ComboProduct,
  ComboItem,
  SoftCopy,
  Synopsis,
  IgnouCard,
  Service,
  Knowledge,
  Project,
  AssignmentInquiry,
  ProjectInquiry,
  FeaturedSection,
  sequelize,
  syncMySQL
};
