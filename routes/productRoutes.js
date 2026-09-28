const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// Tạo sản phẩm
router.post("/", async (req, res, next) => {
  try {
    const { pid, pname, price, quantity } = req.body || {};

    const product = await Product.create({
      pid,
      pname,
      price,
      quantity,
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// Lấy danh sách sản phẩm
router.get("/", async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Lấy một sản phẩm theo pid
router.get("/:pid", async (req, res, next) => {
  try {
    const product = await Product.findOne({ pid: req.params.pid });

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Cập nhật đầy đủ thông tin; giữ nguyên pid
router.put("/:pid", async (req, res, next) => {
  try {
    const { pname, price, quantity } = req.body || {};

    if (
      pname === undefined ||
      price === undefined ||
      quantity === undefined
    ) {
      return res.status(400).json({
        message: "Cần gửi đủ pname, price và quantity",
      });
    }

    const product = await Product.findOneAndUpdate(
      { pid: req.params.pid },
      { $set: { pname, price, quantity } },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Xóa một sản phẩm
router.delete("/:pid", async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({
      pid: req.params.pid,
    });

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json({
      message: "Đã xóa sản phẩm",
      pid: product.pid,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;