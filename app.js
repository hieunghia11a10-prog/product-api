const express = require("express");
const mongoose = require("mongoose");
const productRoutes = require("./routes/productRoutes");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "unavailable",
    database: connected ? "connected" : "disconnected",
  });
});

app.use("/api/products", productRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Đường dẫn không tồn tại" });
});

// Xử lý lỗi tập trung
app.use((error, req, res, next) => {
  if (error.code === 11000) {
    return res.status(409).json({
      message: "Mã sản phẩm pid đã tồn tại",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({ message: error.message });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Nội dung JSON không hợp lệ",
    });
  }

  console.error(error);

  res.status(500).json({
    message: "Lỗi máy chủ",
  });
});

module.exports = app;