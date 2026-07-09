module.exports = (uint8Array, _options = {}) => {
  // Simple mock that always returns UTF-8 encoding.
  // This bypasses the original complex logic which required CJS/ESM interop.
  return 'utf-8';
};
