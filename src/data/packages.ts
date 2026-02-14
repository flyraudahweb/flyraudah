export interface PackageDate {
  id: string;
  outbound: string;
  outboundRoute: string;
  return: string;
  returnRoute: string;
  airline?: string;
  islamicDate?: string;
  islamicReturnDate?: string;
}

export interface PackageAccommodation {
  hotel: string;
  distanceFromHaram?: string;
  distanceFromMasjid?: string;
  rating: number;
  roomTypes: string[];
}

export interface TravelPackage {
  id: string;
  name: string;
  type: "hajj" | "umrah";
  category: "premium" | "standard" | "budget";
  season?: string;
  year: number;
  price: number;
  currency: string;
  agentDiscount: number;
  depositAllowed: boolean;
  minimumDeposit?: number;
  capacity: number;
  available: number;
  inclusions: string[];
  airlines: string[];
  departureCities: string[];
  duration: string;
  dates: PackageDate[];
  makkah: PackageAccommodation;
  madinah: PackageAccommodation;
  status: "active" | "draft" | "archived";
  featured: boolean;
}

export const packages: TravelPackage[] = [
  {
    id: "PKG-HAJJ-2026-001",
    name: "Hajj 2026 - The Ultimate Journey",
    type: "hajj",
    category: "premium",
    year: 2026,
    price: 7800000,
    currency: "NGN",
    agentDiscount: 500000,
    depositAllowed: true,
    minimumDeposit: 2000000,
    capacity: 200,
    available: 155,
    inclusions: [
      "Visa processing",
      "Return flight ticket",
      "Ground transportation in Saudi Arabia",
      "Accommodation in Makkah and Madinah",
      "Breakfast daily",
      "Ziyarat tours",
      "Pre-departure training",
      "Hajj guidebook",
      "Travel bag and essentials",
    ],
    airlines: ["EgyptAir", "Saudi Airlines"],
    departureCities: ["Abuja", "Kano", "Lagos"],
    duration: "42 days",
    dates: [
      {
        id: "HAJJ-2026-001",
        outbound: "2026-06-01",
        outboundRoute: "Nigeria → Saudi Arabia",
        return: "2026-07-12",
        returnRoute: "Saudi Arabia → Nigeria",
      },
    ],
    makkah: {
      hotel: "Premium Hotel (TBD)",
      distanceFromHaram: "500 meters",
      rating: 4,
      roomTypes: ["Double", "Triple", "Quad"],
    },
    madinah: {
      hotel: "Premium Hotel (TBD)",
      distanceFromHaram: "400 meters",
      rating: 4,
      roomTypes: ["Double", "Triple", "Quad"],
    },
    status: "active",
    featured: true,
  },
  {
    id: "PKG-UMRAH-RAM-PREM-ABJ-001",
    name: "Ramadan Umrah 2026 - Premium (Abuja)",
    type: "umrah",
    category: "premium",
    season: "ramadan",
    year: 2026,
    price: 5500000,
    currency: "NGN",
    agentDiscount: 400000,
    depositAllowed: false,
    capacity: 80,
    available: 52,
    inclusions: [
      "Visa processing",
      "Return flight ticket (EgyptAir)",
      "Ground transportation",
      "Premium hotel accommodation",
      "Breakfast daily",
      "Ziyarat tours",
      "Travel insurance",
    ],
    airlines: ["EgyptAir"],
    departureCities: ["Abuja"],
    duration: "18 days",
    dates: [
      {
        id: "RAM-PREM-ABJ-001",
        outbound: "2026-03-03",
        outboundRoute: "Abuja → Madina",
        return: "2026-03-20",
        returnRoute: "Jeddah → Abuja",
      },
    ],
    makkah: {
      hotel: "Poinciana Hotel",
      distanceFromHaram: "300 meters",
      rating: 4,
      roomTypes: ["Double", "Triple"],
    },
    madinah: {
      hotel: "Shaza Regency",
      distanceFromMasjid: "250 meters",
      rating: 4,
      roomTypes: ["Double", "Triple"],
    },
    status: "active",
    featured: true,
  },
  {
    id: "PKG-UMRAH-RAM-STD-MULTI-001",
    name: "Ramadan Umrah 2026 - Standard (Abuja/Kano)",
    type: "umrah",
    category: "standard",
    season: "ramadan",
    year: 2026,
    price: 4500000,
    currency: "NGN",
    agentDiscount: 350000,
    depositAllowed: false,
    capacity: 120,
    available: 73,
    inclusions: [
      "Visa processing",
      "Return flight ticket",
      "Ground transportation",
      "Standard hotel accommodation",
      "Breakfast daily",
      "Ziyarat tours",
    ],
    airlines: ["EgyptAir", "MaxAir"],
    departureCities: ["Abuja", "Kano"],
    duration: "14-16 days",
    dates: [
      { id: "RAM-STD-001", outbound: "2026-02-17", outboundRoute: "Abuja → Madina", return: "2026-03-03", returnRoute: "Jeddah → Abuja", airline: "EgyptAir" },
      { id: "RAM-STD-002", outbound: "2026-02-19", outboundRoute: "Abuja → Madina", return: "2026-03-05", returnRoute: "Jeddah → Abuja", airline: "EgyptAir" },
      { id: "RAM-STD-003", outbound: "2026-02-24", outboundRoute: "Abuja → Madina", return: "2026-03-10", returnRoute: "Jeddah → Abuja", airline: "MaxAir" },
      { id: "RAM-STD-004", outbound: "2026-03-06", outboundRoute: "Abuja → Madina", return: "2026-03-20", returnRoute: "Jeddah → Abuja", airline: "EgyptAir" },
      { id: "RAM-STD-005", outbound: "2026-02-18", outboundRoute: "Kano → Jeddah", return: "2026-03-04", returnRoute: "Jeddah → Kano", airline: "MaxAir" },
      { id: "RAM-STD-006", outbound: "2026-03-01", outboundRoute: "Kano → Jeddah", return: "2026-03-15", returnRoute: "Jeddah → Kano", airline: "MaxAir" },
    ],
    makkah: {
      hotel: "Standard Hotel",
      distanceFromHaram: "800 meters",
      rating: 3,
      roomTypes: ["Triple", "Quad"],
    },
    madinah: {
      hotel: "Standard Hotel",
      distanceFromMasjid: "600 meters",
      rating: 3,
      roomTypes: ["Triple", "Quad"],
    },
    status: "active",
    featured: true,
  },
  {
    id: "PKG-UMRAH-SHAB-BUDGET-001",
    name: "Sha'ban Umrah 2026 - Budget",
    type: "umrah",
    category: "budget",
    season: "shaban",
    year: 2026,
    price: 3000000,
    currency: "NGN",
    agentDiscount: 250000,
    depositAllowed: false,
    capacity: 60,
    available: 38,
    inclusions: [
      "Visa processing",
      "Return flight ticket (Fly Adeal)",
      "Ground transportation",
      "Budget hotel accommodation",
      "Breakfast daily",
    ],
    airlines: ["Fly Adeal"],
    departureCities: ["Kano"],
    duration: "14 days",
    dates: [
      {
        id: "SHAB-BUDGET-001",
        outbound: "2026-02-03",
        outboundRoute: "Kano → Jeddah",
        return: "2026-02-16",
        returnRoute: "Jeddah → Kano",
        islamicDate: "15 Sha'ban 1447 AH",
        islamicReturnDate: "28 Sha'ban 1447 AH",
      },
    ],
    makkah: {
      hotel: "Budget Hotel",
      distanceFromHaram: "1200 meters",
      rating: 2,
      roomTypes: ["Quad"],
    },
    madinah: {
      hotel: "Budget Hotel",
      distanceFromMasjid: "1000 meters",
      rating: 2,
      roomTypes: ["Quad"],
    },
    status: "active",
    featured: false,
  },
  {
    id: "PKG-UMRAH-SHAB-STD-001",
    name: "Sha'ban Umrah 2026 - Standard",
    type: "umrah",
    category: "standard",
    season: "shaban",
    year: 2026,
    price: 3700000,
    currency: "NGN",
    agentDiscount: 300000,
    depositAllowed: false,
    capacity: 80,
    available: 51,
    inclusions: [
      "Visa processing",
      "Return flight ticket (Fly Adeal)",
      "Ground transportation",
      "Standard hotel accommodation",
      "Breakfast daily",
      "Basic ziyarat tour",
    ],
    airlines: ["Fly Adeal"],
    departureCities: ["Kano"],
    duration: "16 days",
    dates: [
      {
        id: "SHAB-STD-001",
        outbound: "2026-02-16",
        outboundRoute: "Kano → Jeddah",
        return: "2026-03-03",
        returnRoute: "Jeddah → Kano",
        islamicDate: "28 Sha'ban 1447 AH",
        islamicReturnDate: "14 Ramadan 1447 AH",
      },
    ],
    makkah: {
      hotel: "Standard Hotel",
      distanceFromHaram: "800 meters",
      rating: 3,
      roomTypes: ["Triple", "Quad"],
    },
    madinah: {
      hotel: "Standard Hotel",
      distanceFromMasjid: "700 meters",
      rating: 3,
      roomTypes: ["Triple", "Quad"],
    },
    status: "active",
    featured: false,
  },
  {
    id: "PKG-UMRAH-RAM-PREM-KNO-001",
    name: "Ramadan Umrah 2026 - Premium (Kano)",
    type: "umrah",
    category: "premium",
    season: "ramadan",
    year: 2026,
    price: 5500000,
    currency: "NGN",
    agentDiscount: 400000,
    depositAllowed: false,
    capacity: 60,
    available: 42,
    inclusions: [
      "Visa processing",
      "Return flight ticket (Saudi Airline)",
      "Ground transportation",
      "Premium hotel accommodation",
      "Breakfast daily",
      "Ziyarat tours",
      "Travel insurance",
    ],
    airlines: ["Saudi Airlines"],
    departureCities: ["Kano"],
    duration: "15 days",
    dates: [
      {
        id: "RAM-PREM-KNO-001",
        outbound: "2026-03-06",
        outboundRoute: "Kano → Jeddah",
        return: "2026-03-20",
        returnRoute: "Jeddah → Kano",
      },
    ],
    makkah: {
      hotel: "Poinciana Hotel",
      distanceFromHaram: "300 meters",
      rating: 4,
      roomTypes: ["Double", "Triple"],
    },
    madinah: {
      hotel: "Shaza Regency",
      distanceFromMasjid: "250 meters",
      rating: 4,
      roomTypes: ["Double", "Triple"],
    },
    status: "active",
    featured: true,
  },
];

export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
