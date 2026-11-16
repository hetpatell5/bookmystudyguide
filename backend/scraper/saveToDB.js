const Knowledge = require("../model/mysql/Knowledge");

exports.saveItems = async (source, items = []) => {
  for (const item of items) {
    try {
      // Sequelize upsert (based on unique constraints, or find-and-update)
      // Since title might not be unique globally, we use source + title as key.
      const exists = await Knowledge.findOne({
        where: { source, title: item.title }
      });

      if (exists) {
        await exists.update(item);
      } else {
        await Knowledge.create({ ...item, source });
      }
    } catch (err) {
      console.error(`❌ Failed to save item: ${item.title}`, err.message);
    }
  }
};
