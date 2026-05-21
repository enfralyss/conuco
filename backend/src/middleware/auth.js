const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'conuco_tech_super_secret_tesis_key';

module.exports = function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token de autenticación requerido' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), SECRET_KEY);
    next();
  } catch {
    res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};
