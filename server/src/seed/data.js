// Demo listings – Karnataka first, plus a few favourites from the rest of India.
// Prices are in ₹ per night and were chosen to cover every GST slab:
//   ≤ ₹1,000 → 0%   |   ₹1,001–7,500 → 5%   |   > ₹7,500 → 18%
// Coordinates are [longitude, latitude].
const U = (id) => `https://images.unsplash.com/photo-${id}`;

const IMG = {
  apt1: U('1522708323590-d24dbb6b0267'),
  apt2: U('1502672260266-1c1ef2d93688'),
  apt3: U('1560448204-e02f11c3d0e2'),
  bed1: U('1505691938895-1758d7feb511'),
  house1: U('1512917774080-9991f1c4c750'),
  pool1: U('1564013799919-ab600027ffc6'),
  lux1: U('1600596542815-ffad4c1539a9'),
  modern1: U('1600585154340-be6161a56a0c'),
  house2: U('1580587771525-78b9dba3b914'),
  cabin1: U('1449158743715-0a90ebb6d2d8'),
  house3: U('1568605114967-8130f3a36994'),
  villa1: U('1613490493576-7fde63acd811'),
  int1: U('1493809842364-78817add7ffb'),
  kitchen1: U('1484154218962-a197022b5858'),
  int2: U('1586023492125-27b2c045efd7'),
  living1: U('1554995207-c18c203602cb'),
  house4: U('1570129477492-45c003edd2be'),
  int3: U('1600607687939-ce8a6c25118c'),
  kitchen2: U('1556909114-f6e7ad7d3136'),
};

const listing = (o) => ({ status: 'approved', isActive: true, ...o });

export const listingsData = [
  // ---------------- Karnataka ----------------
  listing({
    title: 'Coffee Estate Cottage in Coorg',
    description:
      'Wake up to mist rolling over the coffee and pepper plantation. A stone cottage with a private sit-out, home-cooked Kodava meals on request and guided estate walks. 15 minutes from Madikeri town and Raja’s Seat.',
    propertyType: 'cottage',
    images: [IMG.house3, IMG.int2, IMG.bed1],
    pricePerNight: 6500, cleaningFee: 800, maxGuests: 4, bedrooms: 2, beds: 2, bathrooms: 2,
    amenities: ['wifi', 'kitchen', 'free parking', 'heating', 'pet friendly'],
    address: { street: 'Galibeedu Road', city: 'Madikeri (Coorg)', state: 'Karnataka', pincode: '571201' },
    location: { type: 'Point', coordinates: [75.7382, 12.4244] },
  }),
  listing({
    title: 'Hilltop Villa with Valley Views, Chikkamagaluru',
    description:
      'A glass-fronted villa on the slopes of the Baba Budangiri range with an infinity deck, bonfire pit and four en-suite rooms. Mullayanagiri trek starts 20 minutes away – perfect for families and friend groups.',
    propertyType: 'villa',
    images: [IMG.villa1, IMG.lux1, IMG.living1],
    pricePerNight: 11800, cleaningFee: 1500, maxGuests: 8, bedrooms: 4, beds: 5, bathrooms: 4,
    amenities: ['wifi', 'kitchen', 'free parking', 'tv', 'hot tub', 'heating'],
    address: { street: 'Kaimara', city: 'Chikkamagaluru', state: 'Karnataka', pincode: '577101' },
    location: { type: 'Point', coordinates: [75.772, 13.3161] },
  }),
  listing({
    title: 'Boulder-view Heritage Homestay, Hampi',
    description:
      'A restored village home across the Tungabhadra from the Virupaksha temple. Rooftop breakfasts with views over the boulders, cycles for exploring the ruins and a host family that knows every sunset point.',
    propertyType: 'house',
    images: [IMG.house2, IMG.int3, IMG.bed1],
    pricePerNight: 3200, cleaningFee: 300, maxGuests: 3, bedrooms: 1, beds: 2, bathrooms: 1,
    amenities: ['wifi', 'air conditioning', 'free parking'],
    address: { street: 'Virupapur Gaddi', city: 'Hampi', state: 'Karnataka', pincode: '583239' },
    location: { type: 'Point', coordinates: [76.46, 15.335] },
  }),
  listing({
    title: 'Beach Hut near Om Beach, Gokarna',
    description:
      'A simple, breezy wooden hut a two-minute walk from Om Beach. Hammock on the porch, shared kitchen and the best fish thali in town next door. Ideal for backpackers and surfers.',
    propertyType: 'cabin',
    images: [IMG.cabin1, IMG.int1, IMG.kitchen2],
    pricePerNight: 2400, cleaningFee: 200, maxGuests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
    amenities: ['wifi', 'beach access', 'pet friendly'],
    address: { street: 'Om Beach Road', city: 'Gokarna', state: 'Karnataka', pincode: '581326' },
    location: { type: 'Point', coordinates: [74.319, 14.5196] },
  }),
  listing({
    title: 'Palace-view Apartment, Mysuru',
    description:
      'A bright 2BHK on the 5th floor with a balcony facing Mysore Palace – watch it light up every Sunday evening. Walk to Devaraja Market and Chamundi Hill is a 15-minute drive.',
    propertyType: 'apartment',
    images: [IMG.apt1, IMG.kitchen1, IMG.int1],
    pricePerNight: 2800, cleaningFee: 300, maxGuests: 4, bedrooms: 2, beds: 2, bathrooms: 2,
    amenities: ['wifi', 'air conditioning', 'kitchen', 'tv', 'washer'],
    address: { street: 'Sayyaji Rao Road', city: 'Mysuru', state: 'Karnataka', pincode: '570001' },
    location: { type: 'Point', coordinates: [76.6552, 12.3052] },
  }),
  listing({
    title: 'Indiranagar Studio near the Metro, Bengaluru',
    description:
      'A compact, stylish studio two minutes from Indiranagar metro and 100 Feet Road’s cafés. Fast fibre Wi-Fi, ergonomic desk and power backup – built for work trips.',
    propertyType: 'apartment',
    images: [IMG.apt3, IMG.kitchen2, IMG.int2],
    pricePerNight: 3600, cleaningFee: 400, maxGuests: 2, bedrooms: 0, beds: 1, bathrooms: 1,
    amenities: ['wifi', 'air conditioning', 'kitchen', 'workspace', 'washer'],
    address: { street: '12th Main, HAL 2nd Stage', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' },
    location: { type: 'Point', coordinates: [77.6412, 12.9719] },
  }),
  listing({
    title: 'Koramangala Loft for Workations',
    description:
      'Double-height loft with a mezzanine bedroom, standing desk and a terrace garden. In the heart of Koramangala’s startup district – breweries, co-working and Forum Mall within walking distance.',
    propertyType: 'loft',
    images: [IMG.int3, IMG.modern1, IMG.kitchen1],
    pricePerNight: 4500, cleaningFee: 500, maxGuests: 3, bedrooms: 1, beds: 2, bathrooms: 1,
    amenities: ['wifi', 'air conditioning', 'kitchen', 'workspace', 'tv', 'washer'],
    address: { street: '5th Block', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' },
    location: { type: 'Point', coordinates: [77.6245, 12.9352] },
  }),
  listing({
    title: 'Malpe Beach House, Udupi',
    description:
      'A traditional Mangalorean-tiled house steps from Malpe beach, with a coconut-grove garden. Ferry to St. Mary’s Island from the jetty, and Udupi’s famous temple food is ten minutes away.',
    propertyType: 'house',
    images: [IMG.house4, IMG.living1, IMG.bed1],
    pricePerNight: 5200, cleaningFee: 600, maxGuests: 6, bedrooms: 3, beds: 3, bathrooms: 2,
    amenities: ['wifi', 'kitchen', 'beach access', 'free parking', 'washer'],
    address: { street: 'Malpe Beach Road', city: 'Udupi', state: 'Karnataka', pincode: '576108' },
    location: { type: 'Point', coordinates: [74.7042, 13.35] },
  }),
  listing({
    title: 'Riverside Jungle Lodge, Kabini',
    description:
      'Luxury tented lodge on the banks of the Kabini backwaters, bordering Nagarhole National Park. Morning jeep safaris, evening coracle rides and a good chance of spotting elephants from your deck.',
    propertyType: 'cabin',
    images: [IMG.pool1, IMG.cabin1, IMG.int2],
    pricePerNight: 9500, cleaningFee: 1000, maxGuests: 3, bedrooms: 1, beds: 2, bathrooms: 1,
    amenities: ['wifi', 'pool', 'free parking', 'air conditioning'],
    address: { street: 'Karapura, HD Kote Taluk', city: 'Kabini', state: 'Karnataka', pincode: '571114' },
    location: { type: 'Point', coordinates: [76.35, 11.92] },
  }),
  listing({
    title: 'Plantation Bungalow in Sakleshpur',
    description:
      'A 1920s planter’s bungalow surrounded by cardamom and coffee. Red-oxide floors, a fireplace for rainy evenings and the Green Route railway trek nearby.',
    propertyType: 'house',
    images: [IMG.house1, IMG.int3, IMG.kitchen1],
    pricePerNight: 7200, cleaningFee: 700, maxGuests: 6, bedrooms: 3, beds: 4, bathrooms: 2,
    amenities: ['wifi', 'kitchen', 'heating', 'free parking', 'pet friendly'],
    address: { street: 'Hanbal Road', city: 'Sakleshpur', state: 'Karnataka', pincode: '573134' },
    location: { type: 'Point', coordinates: [75.785, 12.9442] },
  }),
  listing({
    title: 'Budget Homestay by the Kali River, Dandeli',
    description:
      'A clean, simple room in a family home – great base for white-water rafting on the Kali and birding in the Dandeli forest. Breakfast included.',
    propertyType: 'other',
    images: [IMG.int1, IMG.bed1, IMG.kitchen2],
    pricePerNight: 950, cleaningFee: 0, maxGuests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
    amenities: ['wifi', 'free parking'],
    address: { street: 'Ambika Nagar', city: 'Dandeli', state: 'Karnataka', pincode: '581325' },
    location: { type: 'Point', coordinates: [74.6167, 15.2667] },
  }),

  // ---------------- Rest of India ----------------
  listing({
    title: 'Beachside Villa with Private Pool, Candolim',
    description:
      'Airy Portuguese-style villa a short walk from Candolim beach. Private pool, shaded garden and a fully equipped kitchen – perfect for families and groups.',
    propertyType: 'villa',
    images: [IMG.pool1, IMG.living1, IMG.bed1],
    pricePerNight: 12500, cleaningFee: 1500, maxGuests: 8, bedrooms: 4, beds: 5, bathrooms: 3,
    amenities: ['wifi', 'pool', 'kitchen', 'air conditioning', 'free parking', 'beach access'],
    address: { street: 'Candolim Road', city: 'Candolim', state: 'Goa', pincode: '403515' },
    location: { type: 'Point', coordinates: [73.7617, 15.5163] },
  }),
  listing({
    title: 'Tea-garden Cottage, Munnar',
    description:
      'A cosy cottage tucked into rolling tea estates with a wraparound verandah. Eravikulam National Park and Top Station are a short drive away.',
    propertyType: 'cottage',
    images: [IMG.house3, IMG.int2, IMG.bed1],
    pricePerNight: 5800, cleaningFee: 500, maxGuests: 4, bedrooms: 2, beds: 2, bathrooms: 1,
    amenities: ['wifi', 'heating', 'kitchen', 'free parking'],
    address: { street: 'Chithirapuram', city: 'Munnar', state: 'Kerala', pincode: '685612' },
    location: { type: 'Point', coordinates: [77.0595, 10.0889] },
  }),
  listing({
    title: 'French Quarter Heritage Home, Puducherry',
    description:
      'Yellow-walled colonial home on a quiet White Town street with a bougainvillea courtyard. Cycle to the Promenade, cafés and Auroville.',
    propertyType: 'house',
    images: [IMG.house2, IMG.int1, IMG.kitchen2],
    pricePerNight: 6000, cleaningFee: 600, maxGuests: 4, bedrooms: 2, beds: 2, bathrooms: 2,
    amenities: ['wifi', 'air conditioning', 'kitchen', 'washer'],
    address: { street: 'Rue Romain Rolland', city: 'Puducherry', state: 'Puducherry', pincode: '605001' },
    location: { type: 'Point', coordinates: [79.835, 11.934] },
  }),
  listing({
    title: 'Colonial Cottage in Ooty',
    description:
      'A stone cottage with a fireplace and rose garden, close to the Botanical Gardens and the Nilgiri Mountain Railway station.',
    propertyType: 'cottage',
    images: [IMG.house4, IMG.int3, IMG.bed1],
    pricePerNight: 4800, cleaningFee: 400, maxGuests: 4, bedrooms: 2, beds: 3, bathrooms: 1,
    amenities: ['wifi', 'heating', 'kitchen', 'free parking'],
    address: { street: 'Fern Hill', city: 'Ooty', state: 'Tamil Nadu', pincode: '643004' },
    location: { type: 'Point', coordinates: [76.695, 11.4102] },
  }),
  listing({
    title: 'Heritage Haveli Suite, Jaipur',
    description:
      'Stay inside a restored haveli in the Pink City with hand-painted walls and a rooftop terrace with fort views. Rajasthani breakfast on request.',
    propertyType: 'house',
    images: [IMG.house2, IMG.int3, IMG.bed1],
    pricePerNight: 5600, cleaningFee: 600, maxGuests: 3, bedrooms: 1, beds: 2, bathrooms: 1,
    amenities: ['wifi', 'air conditioning', 'tv'],
    address: { street: 'Johari Bazaar', city: 'Jaipur', state: 'Rajasthan', pincode: '302003' },
    location: { type: 'Point', coordinates: [75.8267, 26.9239] },
  }),
    listing({
    title: 'Rainforest Homestay in Agumbe',
    description:
      'A quiet family homestay in the Western Ghats, close to Sunset Point and Barkana Falls. Wake up to mist, birdsong and filter coffee – perfect for monsoon treks.',
    propertyType: 'house',
    images: [IMG.house3, IMG.int2, IMG.kitchen1],
    pricePerNight: 1800, cleaningFee: 200, maxGuests: 4, bedrooms: 2, beds: 2, bathrooms: 1,
    amenities: ['wifi', 'kitchen', 'free parking', 'power backup'],
    address: { street: 'Main Road, Agumbe', city: 'Agumbe', state: 'Karnataka', pincode: '577411' },
    location: { type: 'Point', coordinates: [75.0937, 13.5027] },
  }),
];

/** Listings that demonstrate the approval workflow (owned by the unverified host). */
export const moderationListings = [
  {
    title: 'Treehouse in the Kudremukh Rainforest',
    description:
      'A handcrafted treehouse 20 feet up in the canopy, with a rope bridge, outdoor rain shower and night sounds of the Western Ghats. Kudremukh peak trek starts nearby.',
    propertyType: 'cabin',
    images: [IMG.cabin1, IMG.int2],
    pricePerNight: 3900, cleaningFee: 400, maxGuests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
    amenities: ['free parking', 'pet friendly'],
    address: { street: 'Kalasa Road', city: 'Kudremukh', state: 'Karnataka', pincode: '577142' },
    location: { type: 'Point', coordinates: [75.25, 13.2167] },
    status: 'pending',
  },
  {
    title: 'Room near Majestic Bus Stand, Bengaluru',
    description:
      'Private room close to Kempegowda bus station and the city railway station. Convenient for late arrivals and early departures.',
    propertyType: 'other',
    images: [IMG.apt2],
    pricePerNight: 1400, cleaningFee: 0, maxGuests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
    amenities: ['wifi'],
    address: { street: 'Gandhi Nagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560009' },
    location: { type: 'Point', coordinates: [77.5713, 12.9767] },
    status: 'rejected',
    rejectionReason: 'The photo is a stock image and doesn’t show the actual room. Please upload real photos of the space and the bathroom.',
  },
];
