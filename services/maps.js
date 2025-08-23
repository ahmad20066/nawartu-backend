const { Client } = require('@googlemaps/google-maps-services-js');

const client = new Client({});

// Geocode address to coordinates
const geocodeAddress = async (address) => {
  try {
    const response = await client.geocode({
      params: {
        address: address,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: response.data.results[0].formatted_address
      };
    }
    
    throw new Error('No results found for this address');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode address');
  }
};

// Reverse geocode coordinates to address
const reverseGeocode = async (lat, lng) => {
  try {
    const response = await client.reverseGeocode({
      params: {
        latlng: { lat: parseFloat(lat), lng: parseFloat(lng) },
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.results.length > 0) {
      return {
        address: response.data.results[0].formatted_address,
        components: response.data.results[0].address_components
      };
    }
    
    throw new Error('No results found for these coordinates');
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw new Error('Failed to reverse geocode coordinates');
  }
};

// Get nearby places
const getNearbyPlaces = async (lat, lng, radius = 5000, type = null) => {
  try {
    const params = {
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      radius: radius,
      key: process.env.GOOGLE_MAPS_API_KEY
    };

    if (type) {
      params.type = type;
    }

    const response = await client.placesNearby({
      params: params
    });

    return response.data.results.map(place => ({
      placeId: place.place_id,
      name: place.name,
      rating: place.rating,
      types: place.types,
      vicinity: place.vicinity,
      location: place.geometry?.location
    }));
  } catch (error) {
    console.error('Nearby places error:', error);
    throw new Error('Failed to get nearby places');
  }
};

// Get place details
const getPlaceDetails = async (placeId) => {
  try {
    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        fields: ['name', 'formatted_address', 'geometry', 'rating', 'reviews', 'photos', 'website', 'formatted_phone_number'],
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    return response.data.result;
  } catch (error) {
    console.error('Place details error:', error);
    throw new Error('Failed to get place details');
  }
};

// Calculate distance between two points
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Get directions between two points
const getDirections = async (origin, destination, mode = 'driving') => {
  try {
    const response = await client.directions({
      params: {
        origin: origin,
        destination: destination,
        mode: mode,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        distance: route.legs[0].distance.text,
        duration: route.legs[0].duration.text,
        steps: route.legs[0].steps.map(step => ({
          instruction: step.html_instructions,
          distance: step.distance.text,
          duration: step.duration.text
        }))
      };
    }
    
    throw new Error('No route found');
  } catch (error) {
    console.error('Directions error:', error);
    throw new Error('Failed to get directions');
  }
};

module.exports = {
  geocodeAddress,
  reverseGeocode,
  getNearbyPlaces,
  getPlaceDetails,
  calculateDistance,
  getDirections
}; 