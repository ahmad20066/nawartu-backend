const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const { uploadSingleImage } = require('../middleware/upload');
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.post('/', uploadSingleImage('icon'), async (req, res) => {
    const category = new Category({
        name: req.body.name,
        icon: req.file.path
    });
    try {
        const newCategory = await category.save();
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
router.put('/:id', uploadSingleImage('icon'), async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
module.exports = router;