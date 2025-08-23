const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Banner = require('../models/banner');
const { uploadSingleImage } = require('../middleware/upload');

// Get all banners
router.get('/', async (req, res) => {
    try {
        const banners = await Banner.find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            banners
        });
    } catch (error) {
        console.error('Get banners error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get active banners
router.get('/active', async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            banners
        });
    } catch (error) {
        console.error('Get active banners error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get banner by ID
router.get('/:id', async (req, res) => {
    try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid banner ID format'
            });
        }

        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        res.json({
            success: true,
            banner
        });
    } catch (error) {
        console.error('Get banner error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Create new banner
router.post('/', uploadSingleImage('image'), async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.title) {
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Image is required'
            });
        }

        // Debug logging
        console.log('File upload info:', {
            file: req.file,
            path: req.file.path,
            originalname: req.file.originalname
        });

        const bannerData = {
            title: req.body.title,
            image: req.file.path,
            ctaLink: req.body.ctaLink || undefined
        };

        const banner = new Banner(bannerData);
        const newBanner = await banner.save();

        res.status(201).json({
            success: true,
            message: 'Banner created successfully',
            banner: newBanner
        });
    } catch (error) {
        console.error('Create banner error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Update banner
router.put('/:id', uploadSingleImage('image'), async (req, res) => {
    try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid banner ID format'
            });
        }

        const updateData = {};

        if (req.body.title) updateData.title = req.body.title;
        if (req.file && req.file.path) updateData.image = req.file.path;
        if (req.body.ctaLink !== undefined) updateData.ctaLink = req.body.ctaLink;

        // Ensure at least one field is being updated
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        const banner = await Banner.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        res.json({
            success: true,
            message: 'Banner updated successfully',
            banner
        });
    } catch (error) {
        console.error('Update banner error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Delete banner
router.delete('/:id', async (req, res) => {
    try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid banner ID format'
            });
        }

        const banner = await Banner.findByIdAndDelete(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        res.json({
            success: true,
            message: 'Banner deleted successfully'
        });
    } catch (error) {
        console.error('Delete banner error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Toggle banner active status
router.patch('/:id/toggle-status', async (req, res) => {
    try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid banner ID format'
            });
        }

        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        banner.isActive = !banner.isActive;
        await banner.save();

        res.json({
            success: true,
            message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: banner.isActive
        });
    } catch (error) {
        console.error('Toggle banner status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
