export function corsMiddleware(req, res) {
  // Cho phép mọi origin
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Các phương thức được phép
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  // Các header được phép gửi lên
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Nếu là preflight (OPTIONS), trả về 204 No Content
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return false; // Dừng xử lý tiếp
  }

  return true; // Cho phép xử lý tiếp
}