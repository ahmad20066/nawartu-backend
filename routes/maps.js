const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { 
  geocodeAddress, 
  reverseGeocode, 
  getNearbyPlaces, 
  getPlaceDetails,
  calculateDistance,
  getDirections 
} = require('../services/maps');

const router = express.Router();

// Geocode address to coordinates
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const result = await geocodeAddress(address);
    res.json(result);
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Reverse geocode coordinates to address
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const result = await reverseGeocode(lat, lng);
    res.json(result);
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get nearby places
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000, type } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const places = await getNearbyPlaces(lat, lng, radius, type);
    res.json(places);
  } catch (error) {
    console.error('Nearby places error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get place details
router.get('/place/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    
    if (!placeId) {
      return res.status(400).json({ message: 'Place ID is required' });
    }

    const details = await getPlaceDetails(placeId);
    res.json(details);
  } catch (error) {
    console.error('Place details error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Calculate distance between two points
router.post('/distance', async (req, res) => {
  try {
    const { lat1, lng1, lat2, lng2 } = req.body;
    
    if (!lat1 || !lng1 || !lat2 || !lng2) {
      return res.status(400).json({ message: 'All coordinates are required' });
    }

    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    res.json({ distance: `${distance.toFixed(2)} km` });
  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get directions between two points
router.post('/directions', async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required' });
    }

    const directions = await getDirections(origin, destination, mode);
    res.json(directions);
  } catch (error) {
    console.error('Directions error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get nearby attractions for a property
router.get('/attractions/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { radius = 5000 } = req.query;

    // Get property location
    const Property = require('../models/Property');
    const property = await Property.findById(propertyId);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (!property.location.coordinates) {
      return res.status(400).json({ message: 'Property location not available' });
    }

    const { lat, lng } = property.location.coordinates;
    
    // Get nearby attractions
    const attractions = await getNearbyPlaces(lat, lng, radius, 'tourist_attraction');
    
    // Get nearby restaurants
    const restaurants = await getNearbyPlaces(lat, lng, radius, 'restaurant');
    
    // Get nearby transportation
    const transportation = await getNearbyPlaces(lat, lng, radius, 'transit_station');

    res.json({
      attractions: attractions.slice(0, 10),
      restaurants: restaurants.slice(0, 10),
      transportation: transportation.slice(0, 5)
    });
  } catch (error) {
    console.error('Get attractions error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Search places by text
router.get('/search', async (req, res) => {
  try {
    const { query, lat, lng, radius = 5000 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Use Places API text search
    const { Client } = require('@googlemaps/google-maps-services-js');
    const client = new Client({});

    const params = {
      query: query,
      key: process.env.GOOGLE_MAPS_API_KEY
    };

    if (lat && lng) {
      params.location = { lat: parseFloat(lat), lng: parseFloat(lng) };
      params.radius = radius;
    }

    const response = await client.textSearch({ params });

    const results = response.data.results.map(place => ({
      placeId: place.place_id,
      name: place.name,
      rating: place.rating,
      types: place.types,
      vicinity: place.vicinity,
      location: place.geometry?.location,
      photos: place.photos?.slice(0, 3)
    }));

    res.json(results);
  } catch (error) {
    console.error('Search places error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 