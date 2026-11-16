const jwt = require('jsonwebtoken');
const configEnv = require('../config/envConfig');

module.exports = (req, res, next) => {
  const JWT_SECRET = configEnv.jwtSecret;
  // try Bearer token or cookie
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return res.status(401).json({ success: false, message: 'Not authorized, token missing' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};
