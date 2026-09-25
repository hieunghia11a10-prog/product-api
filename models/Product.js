const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    pid: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    pname: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);