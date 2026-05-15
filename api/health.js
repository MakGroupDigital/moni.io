module.exports = function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    success: true,
    service: 'moni-api',
    method: req.method,
    timestamp: new Date().toISOString(),
  }));
};
