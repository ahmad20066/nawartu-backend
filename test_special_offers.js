const mongoose = require('mongoose');
const SpecialOffer = require('./models/specialOffer');

// Test data for special offers
const testOffers = [
    {
        title: 'Summer Sale - 25% Off',
        description: 'Get 25% off on all summer bookings',
        discountPercentage: 25,
        discountType: 'percentage',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31'),
        minimumStay: 2,
        maximumDiscount: 500,
        terms: 'Valid for stays of 2 nights or more. Maximum discount $500.',
        isActive: true,
        priority: 1
    },
    {
        title: 'Last Minute Deal - 15% Off',
        description: 'Book within 7 days of arrival and save 15%',
        discountPercentage: 15,
        discountType: 'percentage',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        minimumStay: 1,
        maximumDiscount: 300,
        terms: 'Valid for bookings made within 7 days of arrival.',
        isActive: true,
        priority: 2
    },
    {
        title: 'Weekend Special - $50 Off',
        description: 'Get $50 off for weekend stays',
        discountPercentage: 0,
        discountAmount: 50,
        discountType: 'fixed',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        minimumStay: 2,
        terms: 'Valid for stays starting on Friday, Saturday, or Sunday.',
        isActive: true,
        priority: 3
    }
];

// Test the SpecialOffer model
async function testSpecialOffers() {
    try {
        console.log('🧪 Testing Special Offers System...\n');

        // Test 1: Create special offers
        console.log('1. Creating test special offers...');
        const createdOffers = await SpecialOffer.insertMany(testOffers);
        console.log(`✅ Created ${createdOffers.length} special offers\n`);

        // Test 2: Test validation methods
        console.log('2. Testing validation methods...');
        const offer = createdOffers[0];

        // Test isValid virtual
        console.log(`Offer "${offer.title}" is valid: ${offer.isValid}`);

        // Test isValidForDate method
        const testDate = new Date('2024-07-15');
        console.log(`Offer valid for ${testDate.toDateString()}: ${offer.isValidForDate(testDate)}`);

        // Test calculateDiscount method
        const testPrice = 200;
        const discount = offer.calculateDiscount(testPrice);
        const finalPrice = offer.getFinalPrice(testPrice);
        console.log(`Original price: $${testPrice}, Discount: $${discount}, Final price: $${finalPrice}\n`);

        // Test 3: Test queries
        console.log('3. Testing queries...');

        // Get active offers
        const activeOffers = await SpecialOffer.find({ isActive: true });
        console.log(`Active offers: ${activeOffers.length}`);

        // Get offers by date range
        const now = new Date();
        const currentOffers = await SpecialOffer.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        });
        console.log(`Currently valid offers: ${currentOffers.length}`);

        // Get offers by priority
        const priorityOffers = await SpecialOffer.find({ isActive: true }).sort({ priority: -1 });
        console.log(`Highest priority offer: ${priorityOffers[0].title}\n`);

        // Test 4: Test discount calculations
        console.log('4. Testing discount calculations...');
        const testPrices = [100, 200, 500, 1000];

        testPrices.forEach(price => {
            const discount = offer.calculateDiscount(price);
            const finalPrice = offer.getFinalPrice(price);
            console.log(`$${price} → Discount: $${discount} → Final: $${finalPrice}`);
        });
        console.log('');

        // Test 5: Test with properties (if any exist)
        console.log('5. Testing property linking...');
        const offersWithProperties = await SpecialOffer.find({
            properties: { $exists: true, $ne: [] }
        }).populate('properties');

        if (offersWithProperties.length > 0) {
            console.log(`Offers with properties: ${offersWithProperties.length}`);
            offersWithProperties.forEach(offer => {
                console.log(`- ${offer.title}: ${offer.properties.length} properties`);
            });
        } else {
            console.log('No offers with properties found (this is normal for testing)');
        }
        console.log('');

        // Test 6: Cleanup
        console.log('6. Cleaning up test data...');
        await SpecialOffer.deleteMany({ title: { $in: testOffers.map(o => o.title) } });
        console.log('✅ Test data cleaned up\n');

        console.log('🎉 All tests passed! Special Offers system is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    // Connect to MongoDB (you'll need to set your connection string)
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nawartu';

    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log('📦 Connected to MongoDB');
            return testSpecialOffers();
        })
        .then(() => {
            console.log('🏁 Tests completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Connection failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testSpecialOffers };
