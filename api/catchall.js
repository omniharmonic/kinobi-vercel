module.exports = async function handler(req, res) {
  const { slug } = req.query;
  res.status(200).json({
    message: "Catchall route hit!",
    slug,
    method: req.method,
    query: req.query,
    url: req.url,
    headers: req.headers
  });
}; 