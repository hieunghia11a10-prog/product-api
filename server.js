require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const Product = require("./models/Product");

async function start() {
  const { HOST, PORT, MONGO_URI } = process.env;
  const port = Number(PORT);

  if (!HOST || !MONGO_URI || !PORT) {
    throw new Error("Thiếu HOST, PORT hoặc MONGO_URI trong .env");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT phải là số nguyên từ 1 đến 65535");
  }

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  // Chờ tạo chỉ mục duy nhất cho pid trước khi nhận yêu cầu
  await Product.init();

  console.log("MongoDB connected");

  const server = app.listen(port, HOST, () => {
    console.log(`API running at http://${HOST}:${port}`);
  });

  server.on("error", (error) => {
    console.error("Không mở được cổng API:", error.message);
    process.exit(1);
  });
}

start().catch((error) => {
  console.error("Khởi động thất bại:", error.message);
  process.exit(1);
});