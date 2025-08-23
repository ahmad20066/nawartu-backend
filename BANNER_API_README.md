# Simple Banner API System

A simple and clean API system for managing promotional banners in the Nawartu application.

## Features

- **Image Upload**: Upload banner images
- **Title Management**: Set banner titles
- **Optional CTA Link**: Add clickable links (optional)
- **Active/Inactive Status**: Toggle banner visibility
- **Simple & Clean**: Minimal fields for easy management

## API Endpoints

### Base URL
```
/api/banners
```

### Endpoints

#### 1. Get All Banners
```http
GET /api/banners
```
Returns all banners sorted by creation date (newest first)

#### 2. Get Active Banners
```http
GET /api/banners/active
```
Returns only active banners for display

#### 3. Get Banner by ID
```http
GET /api/banners/:id
```
Returns a specific banner by its ID

#### 4. Create New Banner
```http
POST /api/banners
```
**Body (multipart/form-data):**
- `title` - Banner title (required, max 100 chars)
- `image` - Banner image file (required)
- `ctaLink` - Click destination URL (optional)

#### 5. Update Banner
```http
PUT /api/banners/:id
```
**Body:** Include only the fields you want to update

#### 6. Delete Banner
```http
DELETE /api/banners/:id
```
Permanently removes a banner

#### 7. Toggle Banner Status
```http
PATCH /api/banners/:id/toggle-status
```
Switches banner between active and inactive

## Data Model

### Banner Schema
```javascript
{
  title: String,        // "Summer Sale Banner" (required)
  image: String,        // Image file path (required)
  ctaLink: String,      // Click destination URL (optional)
  isActive: Boolean,    // true/false (default: true)
  createdAt: Date,      // Auto-generated
  updatedAt: Date       // Auto-generated
}
```

## Mobile App Integration

### Display Banners
```javascript
// Get active banners
const response = await fetch('/api/banners/active');
const data = await response.json();

// Display banners
data.banners.forEach(banner => {
  console.log(`Title: ${banner.title}`);
  console.log(`Image: ${banner.image}`);
  if (banner.ctaLink) {
    console.log(`Link: ${banner.ctaLink}`);
  }
});
```

### Handle Banner Clicks
```javascript
// When user taps a banner
const handleBannerClick = (banner) => {
  if (banner.ctaLink) {
    // Navigate to the CTA link
    window.location.href = banner.ctaLink;
  }
};
```

## Example Usage

### Create a Banner
```javascript
const formData = new FormData();
formData.append('title', 'Summer Sale');
formData.append('image', imageFile);
formData.append('ctaLink', '/summer-offers');

const response = await fetch('/api/banners', {
  method: 'POST',
  body: formData
});
```

### Update a Banner
```javascript
const formData = new FormData();
formData.append('title', 'Updated Summer Sale');

const response = await fetch(`/api/banners/${bannerId}`, {
  method: 'PUT',
  body: formData
});
```

### Toggle Banner Status
```javascript
const response = await fetch(`/api/banners/${bannerId}/toggle-status`, {
  method: 'PATCH'
});
```

## Response Format

All API responses follow this structure:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "banner": { ... } // or "banners": [ ... ]
}
```

## Error Handling

- **400 Bad Request**: Invalid input data or ID format
- **404 Not Found**: Banner not found
- **500 Internal Server Error**: Server-side issues

## Testing

Use the provided Postman collection (`Banner_API_Postman_Collection.json`):
1. Import into Postman
2. Set `base_url` variable to your server URL
3. Update `banner_id` variable as needed
4. Test all endpoints

## File Upload

- Images are uploaded using the existing `uploadSingleImage` middleware
- Supported formats: JPG, PNG, GIF
- Files are stored in the `uploads` directory
- Image path is stored in the database

## Security

- Input validation for all fields
- File type validation for images
- ID format validation using Mongoose
- Proper error handling and logging
