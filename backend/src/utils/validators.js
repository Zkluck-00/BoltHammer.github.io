const httpError = require('./httpError');

function validateRequired(fields) {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || String(value).trim() === '') {
      throw httpError(`El campo ${key} es obligatorio.`, 400);
    }
  }
}

function toNumber(value, fieldName, min = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) {
    throw httpError(`${fieldName} debe ser un numero mayor o igual a ${min}.`, 400);
  }
  return n;
}

module.exports = { validateRequired, toNumber };
