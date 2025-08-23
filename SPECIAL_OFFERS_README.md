# Special Offers System

This system allows you to create and manage special offers and discounts for properties in the Nawartu application. Users can browse properties with special offers and see discounted prices.

## Features

- **Flexible Discount Types**: Percentage-based or fixed amount discounts
- **Date Range Control**: Set start and end dates for offers
- **Property Linking**: Link offers to specific properties or categories
- **Usage Tracking**: Monitor how many times an offer has been used
- **Mobile App Integration**: Perfect for mobile frontend special offers section

## API Endpoints

### Base URL
```
/api/special-offers
```

### Core Operations

#### 1. Get All Special Offers
```http
GET /api/special-offers
```
**Query Parameters:**
- `active` - Filter by active status (true/false)
- `category` - Filter by category ID
- `property` - Filter by property ID

**Response:** List of special offers with populated property and category data

#### 2. Create Special Offer
```http
POST /api/special-offers
```
**Body (multipart/form-data):**
- `title` - Offer title (required)
- `description` - Offer description (required)
- `discountPercentage` - Discount percentage (required)
- `discountType` - "percentage" or "fixed" (default: percentage)
- `startDate` - Offer start date (required)
- `endDate` - Offer end date (required)
- `minimumStay` - Minimum nights required (default: 1)
- `maximumDiscount` - Maximum discount amount
- `terms` - Terms and conditions
- `properties` - JSON array of property IDs
- `categories` - JSON array of category IDs
- `image` - Offer image file

#### 3. Update Special Offer
```http
PUT /api/special-offers/:id
```
**Body:** Same as create, but only include fields to update

#### 4. Delete Special Offer
```http
DELETE /api/special-offers/:id
```

### Property Management

#### 5. Add Properties to Offer
```http
POST /api/special-offers/:id/properties
```
**Body:**
```json
{
  "propertyIds": ["property_id_1", "property_id_2"]
}
```

#### 6. Remove Properties from Offer
```http
DELETE /api/special-offers/:id/properties
```
**Body:**
```json
{
  "propertyIds": ["property_id_1"]
}
```

### Mobile App Integration

#### 7. Get Properties with Special Offers
```http
GET /api/special-offers/properties/with-offers
```
**Query Parameters:**
- `category` - Filter by category
- `location` - Filter by location/city
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter

**Response:** Properties with their attached special offers

#### 8. Calculate Discount
```http
POST /api/special-offers/calculate-discount
```
**Body:**
```json
{
  "propertyId": "property_id",
  "checkIn": "2024-07-15",
  "checkOut": "2024-07-18",
  "guests": 2
}
```

**Response:**
```json
{
  "propertyId": "property_id",
  "propertyTitle": "Property Name",
  "checkIn": "2024-07-15",
  "checkOut": "2024-07-18",
  "stayDuration": 3,
  "guests": 2,
  "originalPrice": 300,
  "discountedPrice": 225,
  "discountAmount": 75,
  "discountPercentage": 25,
  "specialOffer": {
    "id": "offer_id",
    "title": "Summer Sale - 25% Off",
    "description": "Get 25% off on all summer bookings",
    "terms": "Valid for stays of 2 nights or more"
  }
}
```

### Utility Operations

#### 9. Toggle Offer Status
```http
PATCH /api/special-offers/:id/toggle-status
```
Toggles between active and inactive

#### 10. Increment Usage Count
```http
PATCH /api/special-offers/:id/increment-usage
```
Increments the usage counter (useful when offer is applied)

## Mobile App Usage Examples

### 1. Display Special Offers Section
```javascript
// Get all active special offers
const response = await fetch('/api/special-offers?active=true');
const offers = await response.json();

// Display offers in a carousel or grid
offers.forEach(offer => {
  console.log(`${offer.title} - ${offer.discountPercentage}% off`);
});
```

### 2. Show Properties with Offers
```javascript
// Get properties that have special offers
const response = await fetch('/api/special-offers/properties/with-offers');
const propertiesWithOffers = await response.json();

// Display properties with their offers
propertiesWithOffers.forEach(property => {
  property.specialOffers.forEach(offer => {
    console.log(`${property.title}: ${offer.title} - ${offer.discountPercentage}% off`);
  });
});
```

### 3. Calculate Final Price
```javascript
// Calculate discounted price for booking
const response = await fetch('/api/special-offers/calculate-discount', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    propertyId: 'property_id',
    checkIn: '2024-07-15',
    checkOut: '2024-07-18',
    guests: 2
  })
});

const discountInfo = await response.json();
console.log(`Original: $${discountInfo.originalPrice}`);
console.log(`Discounted: $${discountInfo.discountedPrice}`);
console.log(`You save: $${discountInfo.discountAmount}`);
```

## Data Model

### Special Offer Schema
```javascript
{
  title: String,              // "Summer Sale - 25% Off"
  description: String,         // "Get 25% off on all summer bookings"
  discountPercentage: Number,  // 25
  discountType: String,        // "percentage" or "fixed"
  startDate: Date,            // 2024-06-01
  endDate: Date,              // 2024-08-31
  isActive: Boolean,          // true
  properties: [ObjectId],     // Array of property IDs
  categories: [ObjectId],     // Array of category IDs
  minimumStay: Number,        // 2 (minimum nights)
  maximumDiscount: Number,    // 500 (max discount amount)
  terms: String,              // Terms and conditions
  image: String,              // Offer image URL
  priority: Number,           // Display priority (higher = first)
  usageLimit: Number,         // Maximum usage limit
  usedCount: Number,          // Current usage count
  createdAt: Date,            // Auto-generated
  updatedAt: Date             // Auto-generated
}
```

## Best Practices

### 1. Offer Creation
- Set realistic start and end dates
- Use descriptive titles and descriptions
- Include clear terms and conditions
- Set appropriate minimum stay requirements

### 2. Property Linking
- Link offers to specific properties for targeted promotions
- Use categories for broader campaigns
- Avoid overlapping offers on the same property

### 3. Mobile App Integration
- Cache special offers data for offline viewing
- Implement real-time price calculation
- Show offer badges on property cards
- Display offer countdown timers

### 4. Performance
- Use the filtering endpoints to reduce data transfer
- Implement pagination for large offer lists
- Cache frequently accessed offers

## Error Handling

The API includes comprehensive error handling:
- Validation errors for invalid data
- 404 errors for non-existent resources
- 400 errors for bad requests
- 500 errors for server issues

## Testing

Use the provided Postman collection (`Special_Offers_Postman_Collection.json`) to test all endpoints:

1. Import the collection into Postman
2. Set the `base_url` variable to your server URL
3. Update `offer_id` and `property_id` variables as needed
4. Test each endpoint with appropriate data

## Security Considerations

- Validate all input data
- Implement rate limiting for public endpoints
- Use authentication for admin operations
- Sanitize user-generated content
- Validate file uploads

## Future Enhancements

- **Seasonal Offers**: Automatic offer scheduling
- **User-Specific Offers**: Personalized discounts
- **Referral System**: Referral-based discounts
- **Loyalty Program**: Points-based rewards
- **A/B Testing**: Offer performance analytics
- **Email Notifications**: Alert users about new offers
