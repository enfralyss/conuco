const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const repo = require('../repositories/alertasRepo');

router.use(auth);

// GET /api/alertas?loteId=Lote-001 — últimas 50 alertas (opcionalmente filtradas por lote)
router.get('/', async (req, res) => {
  try {
    const loteId = req.query.loteId || null;
    res.json(await repo.findAll(50, loteId));
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// PUT /api/alertas/reconocer-todas
router.put('/reconocer-todas', async (req, res) => {
  try {
    await repo.reconocerTodas();
    res.json({ mensaje: 'Todas las alertas reconocidas' });
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// PUT /api/alertas/:id/reconocer
router.put('/:id/reconocer', async (req, res) => {
  try {
    const alerta = await repo.reconocer(req.params.id);
    if (!alerta) return res.status(404).json({ mensaje: 'Alerta no encontrada' });
    res.json(alerta);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

module.exports = router;
