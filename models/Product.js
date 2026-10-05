const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  pid: { type: String, required: false, unique: true },
  pname: { type: String, required: false },
  price: { type: Number, required: false },
  quantity: { type: Number, required: true},
});

module.exports = mongoose.model("Product", productSchema);