const VALID_ID = /^[a-z0-9]{6,32}$/i;
const CHARSET = 'abcdefghjkmnpqrstuvwxyz23456789';

function validId(id) {
  return typeof id === 'string' && VALID_ID.test(id);
}

function genId() {
  let s = '';
  for (let i = 0; i < 10; i++) {
    s += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return s;
}

module.exports = { validId, genId };
