const Product = require('../models/Product');

// 1. Lấy danh sách tất cả sản phẩm (READ ALL)
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Lấy chi tiết sản phẩm theo pid (READ ONE)
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findOne({ pid: req.params.pid });
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Tạo sản phẩm mới (CREATE)
exports.createProduct = async (req, res) => {
    try {
        const { pid, pname, price, quantity } = req.body;
        const newProduct = new Product({ pid, pname, price, quantity });
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 4. Cập nhật sản phẩm theo pid (UPDATE)
exports.updateProduct = async (req, res) => {
    try {
        const updatedProduct = await Product.findOneAndUpdate(
            { pid: req.params.pid },
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedProduct) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        res.status(200).json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 5. Xóa sản phẩm theo pid (DELETE)
exports.deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findOneAndDelete({ pid: req.params.pid });
        if (!deletedProduct) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        res.status(200).json({ message: 'Xóa sản phẩm thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};