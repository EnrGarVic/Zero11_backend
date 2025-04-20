const bcrypt = require('bcrypt');

const contraseñaPlana = 'cabezon';

bcrypt.hash(contraseñaPlana, 10, (err, hash) => {
  if (err) throw err;
  console.log('Contraseña cifrada:', hash);
});