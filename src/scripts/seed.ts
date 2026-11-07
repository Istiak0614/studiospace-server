import "dotenv/config";
import type { WithId } from "mongodb";
import { bookings, client, reviews, studios } from "../config/db.js";
import type { Booking } from "../types/booking.js";
import type { Studio } from "../types/studio.js";
import { ensureIndexes } from "../utils/indexes.js";
import { recalculateStudioRating } from "../utils/rating.js";

const SEED_GUEST = /@guests\.studiospace\.dev$/;

type SeedStudio = Omit<Studio, "_id" | "ownerEmail" | "ownerName" | "ownerPhoto" | "createdAt" | "updatedAt"> & {
  host: keyof typeof HOSTS;
};

const HOSTS = {
  nadia: { name: "Nadia Rahman", email: "nadia@hosts.studiospace.dev" },
  arif: { name: "Arif Chowdhury", email: "arif@hosts.studiospace.dev" },
  tanvir: { name: "Tanvir Ahmed", email: "tanvir@hosts.studiospace.dev" },
};

const DATA: SeedStudio[] = [
  {
    host: "nadia",
    title: "Daylight Loft Photo Studio",
    category: "Photo Studio",
    hourlyRate: 45, securityDeposit: 100, maxCapacity: 12,
    location: "Gulshan 2, Dhaka",
    images: ["https://images.unsplash.com/photo-1664817550969-5e76adc4a3fe?auto=format&fit=crop&w=1600&q=80",
             "https://images.unsplash.com/photo-1554941829-202a0b2403b8?auto=format&fit=crop&w=1600&q=80",
             "https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    ], 
    amenities: ["North-facing natural light", "Cyclorama wall", "Profoto strobe kit", "Makeup station", "Changing room", "High-speed Wi-Fi"],
    overview: "A bright 1,400 sq ft loft with floor-to-ceiling windows and soft north light all day. Ideal for fashion lookbooks, product flat-lays and portrait sessions, with a full strobe kit ready when the sun goes down.",
    rating: 4.9, reviewCount: 38,
  },
  {
    host: "arif",
    title: "Cyclorama Stage One",
    category: "Film & Sound Stage",
    hourlyRate: 120, securityDeposit: 400, maxCapacity: 40,
    location: "Tejgaon Industrial Area, Dhaka",
    images: ["https://images.unsplash.com/photo-1598006640672-f0cc33c40702?auto=format&fit=crop&w=1600&q=80"], // Unsplash search: "film set studio lights"
    amenities: ["30 ft infinity cove", "Overhead lighting grid", "Green screen", "Generator backup", "Vehicle loading bay", "Private green room"],
    overview: "A full-size sound stage with a pre-lit white cyclorama and an overhead rigging grid. Built for commercials, music videos and short films, with drive-in access for heavy equipment.",
    rating: 4.8, reviewCount: 24,
  },
  {
    host: "tanvir",
    title: "The Mic Room",
    category: "Podcast Lounge",
    hourlyRate: 30, securityDeposit: 50, maxCapacity: 4,
    location: "Dhanmondi 27, Dhaka",
    images: ["https://images.unsplash.com/photo-1660675587581-658b751954cd?auto=format&fit=crop&w=1600&q=80"], // Unsplash search: "podcast studio microphones"
    amenities: ["4× Shure SM7B microphones", "RØDECaster Pro II", "Acoustic treatment", "3-camera video setup", "Live streaming ready", "Soundproof booth"],
    overview: "A cosy, fully treated lounge for up to four voices. Record audio-only or switch on the three-camera rig for video podcasts, and walk out with your files on a USB drive the same day.",
    rating: 4.9, reviewCount: 52,
  },
  {
    host: "nadia",
    title: "Blue Note Music Suite",
    category: "Music Suite",
    hourlyRate: 55, securityDeposit: 150, maxCapacity: 8,
    location: "Banani, Dhaka",
    images: ["https://images.unsplash.com/photo-1621976975813-10e88ae6e450?auto=format&fit=crop&w=1600&q=80"], // Unsplash search: "recording studio mixing desk"
    amenities: ["Yamaha upright piano", "Neve preamps", "Vocal isolation booth", "Full drum kit", "Pro Tools & Logic Pro", "Engineer on request"],
    overview: "A warm-sounding tracking room and control suite for bands, singers and producers. The isolation booth and vintage preamps make it a favourite for vocal sessions and live takes.",
    rating: 4.7, reviewCount: 31,
  },
  {
    host: "arif",
    title: "Clay & Canvas Workshop",
    category: "Art Workshop",
    hourlyRate: 25, securityDeposit: 60, maxCapacity: 15,
    location: "Mirpur DOHS, Dhaka",
    images: ["https://images.unsplash.com/photo-1758522274945-7f000385a3dd?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"], // Unsplash search: "art studio workshop"
    amenities: ["6 pottery wheels", "Kiln access", "Studio easels", "Large work tables", "Wash-up sink area", "Natural daylight"],
    overview: "A spacious, messy-in-the-best-way workshop for painters, potters and group classes. Tables, easels and wheels are ready to go, and kiln firing can be arranged with the host.",
    rating: 4.8, reviewCount: 19,
  },
  {
    host: "tanvir",
    title: "Studio Noir Portrait Room",
    category: "Photo Studio",
    hourlyRate: 35, securityDeposit: 80, maxCapacity: 6,
    location: "Banani 11, Dhaka",
    images: ["https://images.unsplash.com/photo-1615458509633-f15b61bdacb8?auto=format&fit=crop&w=1600&q=80"], // Unsplash search: "dark photography studio"
    amenities: ["Black, white & grey backdrops", "Godox lighting kit", "Posing stools", "Garment steamer", "Tethering station", "Air conditioning"],
    overview: "An intimate, moody space designed for headshots and dramatic portraits. Blackout walls give you total control of light, and the tethering station lets clients review shots live.",
    rating: 4.6, reviewCount: 27,
  },
  {
    host: "nadia",
    title: "Harbour Light Film Stage",
    category: "Film & Sound Stage",
    hourlyRate: 95, securityDeposit: 300, maxCapacity: 30,
    location: "Agrabad, Chattogram",
    images: ["https://images.unsplash.com/photo-1612544409025-e1f6a56c1152?auto=format&fit=crop&w=1600&q=80"], // Unsplash search: "video production studio"
    amenities: ["Full blackout curtains", "LED panel lighting", "Teleprompter", "Wardrobe room", "Parking for 10 cars", "Catering area"],
    overview: "Chattogram's go-to stage for corporate films, interviews and fashion campaigns. Flexible blackout and LED lighting make it easy to shoot day or night scenes on the same booking.",
    rating: 4.5, reviewCount: 12,
  },
  {
    host: "arif",
    title: "Riverside Podcast Pod",
    category: "Podcast Lounge",
    hourlyRate: 22, securityDeposit: 40, maxCapacity: 3,
    location: "Uttara Sector 7, Dhaka",
    images: ["https://images.unsplash.com/photo-1668536618600-754ef972b9b3?auto=format&fit=crop&w=1600&q=80"], // Unsplash search: "podcast recording setup"
    amenities: ["3 Rode PodMic microphones", "Zoom PodTrak P8", "Ring lights", "Soundproofed walls", "4K webcam", "Tea & coffee bar"],
    overview: "A compact, budget-friendly pod for solo shows and interviews. Everything is pre-wired, so you can sit down, press record and focus on the conversation.",
    rating: 4.7, reviewCount: 15,
  },
  {
    host: "tanvir",
    title: "Rooftop Rehearsal Suite",
    category: "Music Suite",
    hourlyRate: 40, securityDeposit: 120, maxCapacity: 10,
    location: "Bashundhara R/A, Dhaka",
    images: ["https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=1600&q=80"], // Unsplash search: "band rehearsal room"
    amenities: ["Marshall & Fender amps", "PA system", "Keyboard stand & synth", "Acoustic panels", "Rooftop lounge", "Instrument storage"],
    overview: "A loud-friendly rehearsal room on a quiet rooftop, with backline amps and a full PA. Perfect for bands preparing for gigs, with a lounge outside for breaks between sets.",
    rating: 4.6, reviewCount: 21,
  },
];
const REVIEWERS = [
  "Sadia Islam", "Rafiq Hasan", "Mehnaz Chowdhury", "Tanzim Rahman",
  "Farhan Kabir", "Nusrat Jahan", "Arnob Das", "Lamia Akter",
].map((name) => ({ name, email: `${name.split(" ")[0].toLowerCase()}@guests.studiospace.dev` }));

const COMMENTS = [
  "Exactly as pictured. Spotless, well lit and the host had everything ready before we arrived.",
  "Booking was effortless and the space felt premium. We wrapped our session an hour early.",
  "The equipment was in excellent condition and the host walked us through every setting.",
  "Perfect for a small team. Easy to find, fast Wi-Fi and a quiet, focused atmosphere.",
  "Clear pricing, quick confirmation and a smooth check-in. Highly recommended.",
  "A little compact for big groups, but ideal for two or three people working together.",
  "Professional setup at a fair hourly rate. It saved us renting gear separately.",
  "Friendly host, flexible with load-in times and very responsive to messages.",
  "Clean, organised and comfortable. Our whole crew was happy from start to finish.",
  "Great value for the quality. The deposit was returned right after the session.",
  "We've booked a lot of spaces in the city and this is one of the most thoughtfully run.",
  "Everything worked first time, which made our tight schedule completely stress-free.",
];

const RATINGS = [5, 5, 4, 5, 4, 5, 5, 4];
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

async function seed() {
  const missing = DATA.filter((s) => s.images.length === 0 || s.images.some((url) => !url.startsWith("https://")));
  if (missing.length > 0) {
    console.error("Add image URLs before seeding:\n- " + missing.map((s) => s.title).join("\n- "));
    process.exitCode = 1;
    return;
  }

  await ensureIndexes();
  console.log("✓ Indexes ready");

  const now = Date.now();
  const seeded: WithId<Studio>[] = [];
  for (const [i, { host, ...studio }] of DATA.entries()) {
    const doc = await studios.findOneAndUpdate(
      { ownerEmail: HOSTS[host].email, title: studio.title },
      {
        $set: { ...studio, ownerEmail: HOSTS[host].email, ownerName: HOSTS[host].name, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date(now - (i + 30) * DAY) },
      },
      { upsert: true, returnDocument: "after" }
    );
    seeded.push(doc!);
  }
  console.log(`✓ ${seeded.length} seed studios up to date`);

  await reviews.deleteMany({ userEmail: { $regex: SEED_GUEST } });
  await bookings.deleteMany({ guestEmail: { $regex: SEED_GUEST } });

  let reviewCount = 0;
  for (const [i, studio] of seeded.entries()) {
    const count = 3 + (i % 3); // 3–5 reviews per studio
    for (let k = 0; k < count; k++) {
      const reviewer = REVIEWERS[(i + k) % REVIEWERS.length];
      const hours = 2 + (k % 3);
      const start = new Date(now - (7 + i * 3 + k * 9) * DAY);
      start.setUTCHours(4, 0, 0, 0); // 10:00 in Dhaka
      const end = new Date(start.getTime() + hours * HOUR);

      const booking: Booking = {
        studioId: studio._id,
        studioTitle: studio.title,
        studioImage: studio.images[0],
        studioLocation: studio.location,
        hostEmail: studio.ownerEmail,
        hostName: studio.ownerName,
        guestEmail: reviewer.email,
        guestName: reviewer.name,
        startTime: start,
        endTime: end,
        hours,
        hourlyRate: studio.hourlyRate,
        securityDeposit: studio.securityDeposit,
        totalPrice: hours * studio.hourlyRate + studio.securityDeposit,
        status: "Completed",
        createdAt: new Date(start.getTime() - 3 * DAY),
        updatedAt: end,
      };
      const { insertedId } = await bookings.insertOne(booking);

      await reviews.insertOne({
        studioId: studio._id,
        bookingId: insertedId,
        userEmail: reviewer.email,
        userName: reviewer.name,
        rating: RATINGS[(i + k) % RATINGS.length],
        comment: COMMENTS[(i * 3 + k) % COMMENTS.length],
        createdAt: new Date(end.getTime() + 2 * HOUR),
      });
      reviewCount++;
    }
  }
  console.log(`✓ ${reviewCount} seed reviews created`);

  const all = await studios.find({}, { projection: { _id: 1 } }).toArray();
  await Promise.all(all.map((s) => recalculateStudioRating(s._id)));
  console.log(`✓ Ratings recalculated for ${all.length} studios`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.close());
