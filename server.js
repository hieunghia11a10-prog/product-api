global.crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const productRoutes = require('./routes/productRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);

// Kết nối MongoDB
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('>>> Kết nối thành công đến MongoDB Container (nammongodb)!');
        app.listen(PORT, () => {
            console.log(`>>> Server đang chạy tại: http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Lỗi kết nối MongoDB:', err);
    });