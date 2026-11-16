const express = require("express");
const router = express.Router();
const { User, Order, sequelize } = require("../model/mysql");
const { Op } = require("sequelize");

/* GET users listing — includes latest order phone as fallback. */
router.get("/", async function (req, res) {
  try {
    const users = await User.findAll({ order: [['createdAt', 'DESC']] });

    // For users with no phoneno, pull the phone from their most recent order
    const emptyPhoneIds = users.filter(u => !u.phoneno).map(u => u.id);
    let phoneMap = {};
    if (emptyPhoneIds.length > 0) {
      const orders = await Order.findAll({
        attributes: ['userId', [sequelize.fn('MAX', sequelize.col('phone')), 'phone']],
        where: { userId: { [Op.in]: emptyPhoneIds }, phone: { [Op.not]: null, [Op.ne]: '' } },
        group: ['userId'],
        raw: true,
      });
      orders.forEach(o => { if (o.phone) phoneMap[o.userId] = o.phone; });
    }

    const result = users.map(u => {
      const plain = u.toJSON();
      if (!plain.phoneno && phoneMap[plain.id]) plain.phoneno = phoneMap[plain.id];
      return plain;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
