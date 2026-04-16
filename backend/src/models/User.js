/**
 * Conuco Tech - Modelo de Usuario
 * Mapeo de la entidad de PostgreSQL para gestionar Identidad.
 */

// Si integráramos Postgres físicamente aquí iniciaríamos la conexión (Ej: const { Pool } = require('pg');).
// Por el paradigma OO, abstraemos esta clase.

class User {
  constructor(id, nombre, email, passwordHash, rol = 'USUARIO') {
    this.id = id;
    this.nombre = nombre;
    this.email = email;
    this.passwordHash = passwordHash;
    this.rol = rol;
  }

  // Métodos de acceso y manipulación (Active Record pattern)
  toJSON() {
    // Al serializar evitamos exponer el has de contraseña
    return {
      id: this.id,
      nombre: this.nombre,
      email: this.email,
      rol: this.rol
    };
  }
}

// Simulador de Singleton para la DB en memoria mientras conectas el Postgres
class UserRepository {
  constructor() {
    this.users = [];
  }

  async save(user) {
    this.users.push(user);
    return user;
  }

  async findByEmail(email) {
    return this.users.find(u => u.email === email) || null;
  }
}

const userRepository = new UserRepository();

module.exports = { User, userRepository };
