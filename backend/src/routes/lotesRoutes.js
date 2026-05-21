const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const repo = require('../repositories/lotesRepo');

router.use(auth);

// GET /api/lotes — listar todos los lotes
router.get('/', async (req, res) => {
  try {
    res.json(await repo.findAll());
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// GET /api/lotes/:id — detalle de un lote
router.get('/:id', async (req, res) => {
  try {
    const lote = await repo.findById(req.params.id);
    if (!lote) return res.status(404).json({ mensaje: 'Lote no encontrado' });
    res.json(lote);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// POST /api/lotes — crear lote
router.post('/', async (req, res) => {
  try {
    const { cultivo, etapa, area, ubicacion, fechaSiembra, imagen } = req.body;
    if (!cultivo || !ubicacion || !area) {
      return res.status(400).json({ mensaje: 'cultivo, ubicacion y area son requeridos' });
    }
    const id = `Lote-${String(Date.now()).slice(-6)}`;
    const nuevoLote = {
      id, cultivo, etapa: etapa || 'Preparación',
      area: parseFloat(area), ubicacion,
      fechaSiembra: fechaSiembra || new Date().toISOString().split('T')[0],
      salud: 'optima', imagen: imagen || '🌱',
      tempActual: +(25 + Math.random() * 4).toFixed(1),
      humActual:  +(60 + Math.random() * 10).toFixed(1),
      phActual:   +(6.2 + Math.random() * 0.6).toFixed(2),
    };
    const creado = await repo.create(nuevoLote);
    res.status(201).json(creado);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// PUT /api/lotes/:id — actualizar lote
router.put('/:id', async (req, res) => {
  try {
    const actualizado = await repo.update(req.params.id, req.body);
    if (!actualizado) return res.status(404).json({ mensaje: 'Lote no encontrado' });
    res.json(actualizado);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// DELETE /api/lotes/:id — eliminar (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const ok = await repo.remove(req.params.id);
    if (!ok) return res.status(404).json({ mensaje: 'Lote no encontrado' });
    res.json({ mensaje: 'Lote eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

module.exports = router;
