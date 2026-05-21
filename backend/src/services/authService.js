const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/pool');
const { User, userRepository } = require('../models/User');

const SECRET_KEY = process.env.JWT_SECRET || 'conuco_tech_super_secret_tesis_key';

class AuthService {
  static async registrar(nombre, email, password) {
    const salt         = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const nuevoId      = `usr-${Date.now()}`;

    if (pool) {
      const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
      if (existe.rows.length > 0) throw new Error('El correo ya está registrado en Conuco Tech.');

      await pool.query(
        'INSERT INTO usuarios (id, nombre, email, password_hash, rol) VALUES ($1,$2,$3,$4,$5)',
        [nuevoId, nombre, email, passwordHash, 'USUARIO']
      );
      return new User(nuevoId, nombre, email, passwordHash);
    }

    // fallback in-memory
    const existe = await userRepository.findByEmail(email);
    if (existe) throw new Error('El correo ya está registrado en Conuco Tech.');
    const usuario = new User(nuevoId, nombre, email, passwordHash);
    await userRepository.save(usuario);
    return usuario;
  }

  static async login(email, password) {
    let usuario = null;

    if (pool) {
      const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
      if (rows[0]) {
        usuario = new User(rows[0].id, rows[0].nombre, rows[0].email, rows[0].password_hash, rows[0].rol);
      }
    } else {
      usuario = await userRepository.findByEmail(email);
    }

    if (!usuario) throw new Error('Credenciales inválidas');

    const esValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!esValida) throw new Error('Credenciales inválidas');

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      SECRET_KEY,
      { expiresIn: '8h' }
    );

    return { usuario, token };
  }
}

module.exports = AuthService;
