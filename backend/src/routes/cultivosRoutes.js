const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const repo = require('../repositories/cultivosRepo');

router.use(auth);

// GET /api/cultivos?loteId=Lote-001 — historial completo o filtrado por lote
router.get('/', async (req, res) => {
  try {
    const loteId = req.query.loteId || null;
    res.json(await repo.findAll(loteId));
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// POST /api/cultivos — registrar nuevo ciclo de cultivo
router.post('/', async (req, res) => {
  try {
    const { lote, cultivo, etapa, fechaSiembra, fechaCosecha, rendimiento, unidad, estado, notas } = req.body;
    if (!cultivo || !fechaSiembra) {
      return res.status(400).json({ mensaje: 'cultivo y fechaSiembra son requeridos' });
    }
    const creado = await repo.create({
      lote: lote || '—', cultivo, etapa: etapa || 'Preparación',
      fechaSiembra, fechaCosecha: fechaCosecha || null,
      rendimiento: rendimiento != null ? parseFloat(rendimiento) : null,
      unidad: unidad || 'ton/ha', estado: estado || 'en_curso',
      notas: notas || '',
    });
    res.status(201).json(creado);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

module.exports = router;
