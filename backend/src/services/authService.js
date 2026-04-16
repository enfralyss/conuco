const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, userRepository } = require('../models/User');

const SECRET_KEY = 'conuco_tech_super_secret_tesis_key'; // En prod usar process.env.JWT_SECRET

class AuthService {
  /**
   * Registra un nuevo granjero/productor
   */
  static async registrar(nombre, email, password) {
    const existe = await userRepository.findByEmail(email);
    if (existe) {
      throw new Error('El correo ya está registrado en Conuco Tech.');
    }

    // Encriptación (hashing) de la contraseña para seguridad BD
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nuevoId = `usr-${Date.now()}`;
    const nuevoUsuario = new User(nuevoId, nombre, email, passwordHash);

    await userRepository.save(nuevoUsuario);
    return nuevoUsuario;
  }

  /**
   * Autenticación y generación de JWT
   */
  static async login(email, password) {
    const usuario = await userRepository.findByEmail(email);
    if (!usuario) {
      throw new Error('Credenciales inválidas');
    }

    // Validar contraseña
    const esValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!esValida) {
      throw new Error('Credenciales inválidas');
    }

    // Generar JSON Web Token
    const payload = {
      id: usuario.id,
      rol: usuario.rol
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '8h' });

    return { usuario, token };
  }
}

module.exports = AuthService;
