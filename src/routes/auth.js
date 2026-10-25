const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password || password.length < 6) {
    return res
      .status(400)
      .json({ error: 'email et mot de passe (6 caractères min.) requis' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'email déjà utilisé' });
    }
    console.error(err);
    res.status(500).json({ error: 'erreur serveur' });
  }
});

module.exports = router;