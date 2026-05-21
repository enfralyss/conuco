const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const repo    = require('../repositories/umbralesRepo');

router.use(auth);

// GET /api/configuracion/umbrales?loteId=Lote-001
// loteId omitido → devuelve umbrales globales del usuario
// loteId presente → devuelve umbrales de esa parcela (fallback a globales si no existen)
router.get('/umbrales', async (req, res) => {
  try {
    const loteId = req.query.loteId || null;
    res.json(await repo.get(req.user.id, loteId));
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// PUT /api/configuracion/umbrales
// Body: { loteId?: 'Lote-001', temp_advertencia_alto: 28, ... }
// loteId ausente/null → guarda como global
router.put('/umbrales', async (req, res) => {
  try {
    const guardados = await repo.save(req.user.id, req.body);
    res.json({ mensaje: 'Umbrales actualizados', umbrales: guardados });
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

module.exports = router;
