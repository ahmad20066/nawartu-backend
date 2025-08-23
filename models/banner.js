const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BannerSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    image: {
        type: String,
        required: true
    },
    ctaLink: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
BannerSchema.index({ isActive: 1, createdAt: -1 });

const Banner = mongoose.model('Banner', BannerSchema);

module.exports = Banner;
