const AuthService = require('../services/authService');

class AuthController {
  
  static async register(req, res) {
    try {
      const { nombre, email, password } = req.body;
      if (!nombre || !email || !password) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
      }

      const usuario = await AuthService.registrar(nombre, email, password);
      res.status(201).json({ 
        mensaje: 'Productor registrado con éxito', 
        usuario: usuario.toJSON() 
      });
    } catch (error) {
      res.status(400).json({ mensaje: error.message });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ mensaje: 'Email y password son requeridos' });
      }

      const { usuario, token } = await AuthService.login(email, password);
      res.status(200).json({
        mensaje: 'Autenticado correctamente',
        token,
        usuario: usuario.toJSON()
      });
    } catch (error) {
      // 401 para fallos de auth
      res.status(401).json({ mensaje: error.message });
    }
  }
}

module.exports = AuthController;
