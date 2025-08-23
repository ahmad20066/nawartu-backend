const mongoose = require('mongoose');
const User = require('./models/User');
const Property = require('./models/Property');
require('dotenv').config();

// Sample users data
const sampleUsers = [
  {
    name: 'Ahmad Al-Hamid',
    email: 'ahmad@example.com',
    password: 'password123',
    phone: '+963 11 123 4567',
    role: 'host',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  {
    name: 'Fatima Al-Zahra',
    email: 'fatima@example.com',
    password: 'password123',
    phone: '+963 11 234 5678',
    role: 'host',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
  },
  {
    name: 'Omar Al-Rashid',
    email: 'omar@example.com',
    password: 'password123',
    phone: '+963 11 345 6789',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  {
    name: 'Layla Al-Malik',
    email: 'layla@example.com',
    password: 'password123',
    phone: '+963 11 456 7890',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
  }
];

// Sample properties data
const sampleProperties = [
  {
    title: 'Ard Dyar Courtyard Home',
    description: 'A beautiful traditional Damascus courtyard house in the heart of the Old City. Experience authentic Syrian hospitality with modern comforts.',
    location: {
      address: 'Ard Dyar Street, Old Damascus',
      neighborhood: 'Old City',
      city: 'Damascus',
      coordinates: { lat: 33.5138, lng: 36.2765 }
    },
    price: 55,
    images: [
      'https://syriascopetravel.com/wp-content/uploads/2024/10/Damascus-hotel.jpg',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=60'
    ],
    amenities: ['Wi-Fi', 'Kitchen', 'Air Conditioning', 'TV', 'Balcony'],
    capacity: {
      guests: 4,
      bedrooms: 2,
      bathrooms: 1
    },
    propertyType: 'Traditional',
    instantBookable: true
  },
  {
    title: 'Damascus Roof Terrace',
    description: 'Stunning rooftop apartment with panoramic views of Damascus. Perfect for couples or small families seeking a unique experience.',
    location: {
      address: 'Bab Touma Square, Damascus',
      neighborhood: 'Bab Touma',
      city: 'Damascus',
      coordinates: { lat: 33.5147, lng: 36.3175 }
    },
    price: 65,
    images: [
      'https://syriascopetravel.com/wp-content/uploads/2024/10/IMG_E1873.jpg',
      'https://images.unsplash.com/photo-1618221358593-706e36ddab1a?auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=60'
    ],
    amenities: ['Wi-Fi', 'Kitchen', 'Air Conditioning', 'Heating', 'TV', 'Balcony'],
    capacity: {
      guests: 2,
      bedrooms: 1,
      bathrooms: 1
    },
    propertyType: 'Apartment',
    instantBookable: false
  },
  {
    title: 'Traditional Mosaic Suite',
    description: 'Luxurious suite featuring traditional Damascus mosaic work. Located in the historic Al-Qaymariyya district.',
    location: {
      address: 'Al-Qaymariyya Street, Damascus',
      neighborhood: 'Al‑Qasaa',
      city: 'Damascus',
      coordinates: { lat: 33.5156, lng: 36.2987 }
    },
    price: 60,
    images: [
      'https://syriascopetravel.com/wp-content/uploads/2024/10/FB_IMG_1729252510829.jpg',
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=60'
    ],
    amenities: ['Wi-Fi', 'Kitchen', 'Air Conditioning', 'Heating', 'TV', 'Washing Machine'],
    capacity: {
      guests: 3,
      bedrooms: 1,
      bathrooms: 1
    },
    propertyType: 'Studio',
    instantBookable: true
  },
  {
    title: 'Modern Damascus Loft',
    description: 'Contemporary loft space in the vibrant Straight Street area. Perfect blend of modern design and historic location.',
    location: {
      address: 'Straight Street, Damascus',
      neighborhood: 'Al‑Malki',
      city: 'Damascus',
      coordinates: { lat: 33.5165, lng: 36.2798 }
    },
    price: 70,
    images: [
      'https://images.unsplash.com/photo-1618221358593-706e36ddab1a?auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=60'
    ],
    amenities: ['Wi-Fi', 'Kitchen', 'Air Conditioning', 'Heating', 'TV', 'Free Parking'],
    capacity: {
      guests: 4,
      bedrooms: 2,
      bathrooms: 2
    },
    propertyType: 'Loft',
    instantBookable: false
  },
  {
    title: 'Courtyard House Al-Shaghour',
    description: 'Charming courtyard house in the traditional Al-Shaghour neighborhood. Experience authentic Damascus living.',
    location: {
      address: 'Al-Shaghour District, Damascus',
      neighborhood: 'Al‑Hamidiyah',
      city: 'Damascus',
      coordinates: { lat: 33.5174, lng: 36.2609 }
    },
    price: 58,
    images: [
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1618221358593-706e36ddab1a?auto=format&fit=crop&w=800&q=60'
    ],
    amenities: ['Wi-Fi', 'Kitchen', 'Air Conditioning', 'Garden', 'Security'],
    capacity: {
      guests: 6,
      bedrooms: 3,
      bathrooms: 2
    },
    propertyType: 'House',
    instantBookable: true
  },
  {
    title: 'Damascus Salon',
    description: 'Elegant salon-style apartment in the upscale Sarouja district. Perfect for business travelers or families.',
    location: {
      address: 'Sarouja District, Damascus',
      neighborhood: 'Shaalan',
      city: 'Damascus',
      coordinates: { lat: 33.5183, lng: 36.2420 }
    },
    price: 75,
    images: [
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1618221358593-706e36ddab1a?auto=format&fit=crop&w=800&q=60'
    ],
    amenities: ['Wi-Fi', 'Kitchen', 'Air Conditioning', 'Heating', 'TV', 'Elevator', 'Security'],
    capacity: {
      guests: 4,
      bedrooms: 2,
      bathrooms: 2
    },
    propertyType: 'Apartment',
    instantBookable: false
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nawartu')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Seed function
const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Property.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.name}`);
    }

    // Create properties and assign hosts
    const hosts = createdUsers.filter(user => user.role === 'host');
    for (let i = 0; i < sampleProperties.length; i++) {
      const propertyData = sampleProperties[i];
      const host = hosts[i % hosts.length]; // Distribute properties among hosts
      
      const property = new Property({
        ...propertyData,
        host: host._id
      });
      
      await property.save();
      console.log(`Created property: ${property.title} (Host: ${host.name})`);
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase(); 