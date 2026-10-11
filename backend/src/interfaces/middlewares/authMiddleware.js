const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No se envió token de acceso' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(401).json({ error: 'Requiere ser admin' });
    req.user = decoded;
    next();
  } catch (error) { res.status(401).json({ error: 'Token inválido' }); }
};

const verifyVendedor = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No se envió token de acceso' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'vendedor' && decoded.role !== 'admin') return res.status(401).json({ error: 'Requiere rol vendedor' });
    req.user = decoded;
    next();
  } catch (error) { res.status(401).json({ error: 'Token inválido' }); }
};

// NUEVA FUNCIÓN PARA EL DISTRIBUIDOR
const verifyDistribuidor = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No se envió token de acceso' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'distribuidor' && decoded.role !== 'admin') return res.status(401).json({ error: 'Requiere rol distribuidor' });
    req.user = decoded;
    next();
  } catch (error) { res.status(401).json({ error: 'Token inválido' }); }
};
// NUEVA FUNCIÓN GENERAL (Lee el token sin importar el rol)
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No se envió token de acceso' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded; // Guardamos el usuario para que el controlador lo pueda usar
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const verifyOrderCreator = (req, res, next) => {
  verifyToken(req, res, () => {
    if (!['user', 'distribuidor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Este rol no puede crear pedidos' });
    }
    next();
  });
};

module.exports = { verifyToken, verifyAdmin, verifyVendedor, verifyDistribuidor, verifyOrderCreator };
