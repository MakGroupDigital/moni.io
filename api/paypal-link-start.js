module.exports = async function handler(req, res) {
  try {
    const run = require('./paypal/link/start.bundle.cjs');
    return await run(req, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      success: false,
      error: error && error.message ? error.message : 'Erreur serveur liaison PayPal.',
      route: 'paypal-link-start',
    }));
  }
};
