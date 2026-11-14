/**
 * Indian State & Union Territory Cadastral Land Unit Standards
 * Covers all 28 States and 8 Union Territories with official and customary revenue units.
 * References:
 * - Survey of India (SoI) Geodetic & Cadastral Manuals
 * - State Land Revenue Codes & Cadastral Survey Manuals (RoR / Jamabandi / 7/12 / Patta Chitta)
 * - Directorate of Economics and Statistics (DES), Ministry of Agriculture & Farmers Welfare
 * - IS 1492 Metric Chain & Gunter's Chain surveying standards
 */

export interface StateCadastralUnit {
  key: string;
  name: string;
  localName?: string;
  sqft: number;
  sqm: number;
  description: string;
  category?: 'traditional' | 'metric' | 'colonial' | 'customary';
}

export type IndianRegion =
  | 'North'
  | 'South'
  | 'East'
  | 'West'
  | 'Central'
  | 'North-East'
  | 'Union Territory'
  | 'National';

export interface IndianStateInfo {
  state: string;
  code: string;
  region: IndianRegion;
  capital?: string;
  revenuePortal?: string;
  primaryUnits: string[];
  units: StateCadastralUnit[];
  notes: string;
}

// 1 Sq. Foot = 0.09290304 Sq. Meters
const SQFT_TO_SQM = 0.09290304;

function createUnit(
  key: string,
  name: string,
  localName: string,
  sqft: number,
  description: string,
  category: 'traditional' | 'metric' | 'colonial' | 'customary' = 'traditional'
): StateCadastralUnit {
  return {
    key,
    name,
    localName,
    sqft,
    sqm: Number((sqft * SQFT_TO_SQM).toFixed(4)),
    description,
    category,
  };
}

// Common base units available everywhere
const BASE_UNITS = {
  sqft: createUnit('sqft', 'Square Feet', 'वर्ग फुट', 1, 'Standard international square foot (0.0929 m²)', 'metric'),
  sqyd: createUnit('sqyd', 'Square Yard (Gaj)', 'वर्ग गज', 9, '1 Sq. Yard = 9 Sq. Feet = 0.8361 m²', 'customary'),
  sqm: {
    key: 'sqm',
    name: 'Square Meter (SI)',
    localName: 'वर्ग मीटर',
    sqft: Number((1 / SQFT_TO_SQM).toFixed(4)),
    sqm: 1,
    description: 'Standard SI metric unit (1 m² = 10.7639 sq ft)',
    category: 'metric' as const,
  },
  cent: createUnit('cent', 'Cent / Decimal', 'सेंटी / डेसिमल', 435.6, '1 Cent = 1/100 Acre = 435.6 Sq. Ft = 48.4 Sq. Yds = 40.468 m²', 'customary'),
  gunta: createUnit('gunta', 'Gunta / Guntha', 'गुंठा', 1089, '1 Gunta = 1/40 Acre = 1089 Sq. Ft = 121 Sq. Yds = 101.171 m²', 'customary'),
  acre: createUnit('acre', 'Acre', 'एकड़', 43560, '1 Acre = 4840 Sq. Yds = 43560 Sq. Ft = 4046.856 m² = 100 Cents = 40 Guntas', 'colonial'),
  hectare: {
    key: 'hectare',
    name: 'Hectare',
    localName: 'हेक्टेयर',
    sqft: Number((10000 / SQFT_TO_SQM).toFixed(2)),
    sqm: 10000,
    description: '1 Hectare = 10,000 m² = 2.47105 Acres = 100 Ares',
    category: 'metric' as const,
  },
  are: {
    key: 'are',
    name: 'Are',
    localName: 'आर',
    sqft: Number((100 / SQFT_TO_SQM).toFixed(2)),
    sqm: 100,
    description: '1 Are = 100 m² = 1076.39 Sq. Ft = 2.471 Cents',
    category: 'metric' as const,
  },
  ground: createUnit('ground', 'Ground', 'மனை (கிரவுண்ட்)', 2400, '1 Ground = 2400 Sq. Ft = 222.967 m²', 'customary'),
};

export const ALL_INDIAN_STATES_DATA: Record<string, IndianStateInfo> = {
  // ================= NORTH INDIA =================
  Punjab: {
    state: 'Punjab',
    code: 'PB',
    region: 'North',
    capital: 'Chandigarh',
    revenuePortal: 'PLRS (Punjab Land Records Society) / Jamabandi',
    primaryUnits: ['Kanal', 'Marla', 'Sarsahi', 'Acres', 'Sq. Yards (Gaj)', 'Sq. Feet'],
    units: [
      BASE_UNITS.acre,
      createUnit('kanal', 'Kanal', 'ਕਨਾਲ (कनाल)', 5445, '1 Acre = 8 Kanals; 1 Kanal = 605 Sq. Yds = 5445 Sq. Ft = 505.857 m²'),
      createUnit('marla', 'Marla', 'ਮਰਲਾ (मरला)', 272.25, '1 Kanal = 20 Marlas; 1 Marla = 30.25 Sq. Yds = 272.25 Sq. Ft = 25.293 m²'),
      createUnit('sarsahi', 'Sarsahi / Biswansi', 'ਸਰਸਾਹੀ', 30.25, '1 Marla = 9 Sarsahi; 1 Sarsahi = 3.36 Sq. Yds = 30.25 Sq. Ft = 2.810 m²'),
      createUnit('karam_sq', 'Square Karam', 'ਕਰਮ (करम)', 30.25, '1 Karam = 66 inches (5.5 ft); 1 Sq. Karam = 30.25 Sq. Ft = 1 Sarsahi'),
      createUnit('bigha_punjab', 'Punjab Bigha (Pucca)', 'ਬੀਘਾ', 21780, 'Customary standard: 1 Bigha = 4 Kanals = 21,780 Sq. Ft = 0.5 Acre'),
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
      BASE_UNITS.hectare,
    ],
    notes: 'Cadastral system based on Gunter Chain and Karam (66 inches). 1 Acre = 8 Kanals = 160 Marlas = 1,440 Sarsahis.',
  },

  Haryana: {
    state: 'Haryana',
    code: 'HR',
    region: 'North',
    capital: 'Chandigarh',
    revenuePortal: 'Jamabandi Haryana / HALRIS',
    primaryUnits: ['Kanal', 'Marla', 'Biswa', 'Acres', 'Sq. Yards (Gaj)', 'Sq. Feet'],
    units: [
      BASE_UNITS.acre,
      createUnit('kanal', 'Kanal', 'कनाल', 5445, '1 Acre = 8 Kanals; 1 Kanal = 20 Marlas = 5445 Sq. Ft = 505.857 m²'),
      createUnit('marla', 'Marla', 'मरला', 272.25, '1 Kanal = 20 Marlas; 1 Marla = 272.25 Sq. Ft = 25.293 m²'),
      createUnit('sarsahi', 'Sarsahi', 'सरसाही', 30.25, '1 Marla = 9 Sarsahis = 30.25 Sq. Ft'),
      createUnit('bigha_haryana', 'Haryana Bigha', 'बीघा', 27225, 'Standard Pucca Bigha = 5 Kanals = 27,225 Sq. Ft = 3025 Sq. Yds'),
      createUnit('biswa_haryana', 'Biswa (Haryana)', 'बिस्वा', 1361.25, '1 Bigha = 20 Biswa; 1 Biswa = 1361.25 Sq. Ft = 151.25 Sq. Yds'),
      createUnit('biswansi_haryana', 'Biswansi', 'बिस्वांसी', 68.0625, '1 Biswa = 20 Biswansi = 68.06 Sq. Ft'),
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
      BASE_UNITS.hectare,
    ],
    notes: 'Northern Haryana uses Kanal-Marla system; southern districts (Rewari, Gurugram rural, Narnaul) also record in Bigha-Biswa.',
  },

  'Uttar Pradesh': {
    state: 'Uttar Pradesh',
    code: 'UP',
    region: 'North',
    capital: 'Lucknow',
    revenuePortal: 'Bhulekh UP (UP Land Records)',
    primaryUnits: ['Pucca Bigha', 'Kacha Bigha', 'Biswa', 'Biswansi', 'Hectares', 'Acres', 'Sq. Yards (Gaj)'],
    units: [
      createUnit('bigha_pucca_up', 'Pucca Bigha (Standard)', 'पक्का बीघा', 27225, '1 Pucca Bigha = 3025 Sq. Yds (55×55 yds) = 27,225 Sq. Ft = 2529.285 m² = 20 Biswa'),
      createUnit('bigha_kacha_up', 'Kacha Bigha', 'कच्चा बीघा', 9075, '1 Kacha Bigha = 1/3 Pucca Bigha = 1008.33 Sq. Yds = 9075 Sq. Ft = 843.095 m²'),
      createUnit('biswa_up', 'Biswa', 'बिस्वा', 1361.25, '1 Pucca Bigha = 20 Biswa; 1 Biswa = 151.25 Sq. Yds = 1361.25 Sq. Ft = 126.464 m²'),
      createUnit('biswansi_up', 'Biswansi', 'बिस्वांसी', 68.0625, '1 Biswa = 20 Biswansi; 1 Biswansi = 68.06 Sq. Ft = 6.323 m²'),
      BASE_UNITS.hectare,
      BASE_UNITS.acre,
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
    ],
    notes: 'UP Revenue Code standardizes official land registration in Hectares and Pucca Bigha. 1 Acre = 1.6 Pucca Bigha = 4.8 Kacha Bigha = 32 Biswa.',
  },

  Uttarakhand: {
    state: 'Uttarakhand',
    code: 'UK',
    region: 'North',
    capital: 'Dehradun',
    revenuePortal: 'Bhulekh Uttarakhand / Devbhoomi',
    primaryUnits: ['Nali', 'Mutthi', 'Bigha (Hill)', 'Acres', 'Hectares', 'Sq. Feet'],
    units: [
      createUnit('nali', 'Nali', 'नाली', 2160, '1 Nali = 240 Sq. Yds = 2160 Sq. Ft = 200.67 m² = 16 Mutthi (Hill Cadastral Standard)'),
      createUnit('mutthi', 'Mutthi', 'मुट्ठी', 135, '1 Nali = 16 Mutthi; 1 Mutthi = 15 Sq. Yds = 135 Sq. Ft = 12.542 m²'),
      createUnit('bigha_uk', 'Uttarakhand Bigha', 'बीघा', 6804, 'Hill measurement standard: 1 Bigha = 3.15 Nali = 756 Sq. Yds = 6804 Sq. Ft = 632.11 m²'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
    ],
    notes: 'Kumaon and Garhwal hill surveys historically use seed-capacity units: 1 Acre = 20.166 Nalis. Plain areas (Haridwar, US Nagar) follow UP Bigha-Biswa.',
  },

  'Himachal Pradesh': {
    state: 'Himachal Pradesh',
    code: 'HP',
    region: 'North',
    capital: 'Shimla',
    revenuePortal: 'Himbhoomi / HP Land Records',
    primaryUnits: ['Bigha (HP)', 'Biswa (HP)', 'Biswansi', 'Kanal', 'Marla', 'Acres'],
    units: [
      createUnit('bigha_hp', 'Himachal Bigha', 'बीघा (हि.प्र.)', 8712, '1 Bigha = 968 Sq. Yds = 8712 Sq. Ft = 809.37 m² = 0.20 Acre (5 Bigha = 1 Acre)'),
      createUnit('biswa_hp', 'Himachal Biswa', 'बिस्वा (हि.प्र.)', 435.6, '1 Bigha = 20 Biswa; 1 Biswa = 48.4 Sq. Yds = 435.6 Sq. Ft = 40.468 m² (equal to 1 Cent)'),
      createUnit('biswansi_hp', 'Himachal Biswansi', 'बिस्वांसी', 21.78, '1 Biswa = 20 Biswansi = 21.78 Sq. Ft = 2.023 m²'),
      createUnit('kanal_hp', 'Kanal (Kangra)', 'कनाल', 5445, 'Kangra & lower belt use Kanal = 5445 Sq. Ft'),
      createUnit('marla_hp', 'Marla (Kangra)', 'मरला', 272.25, '1 Kanal = 20 Marlas = 272.25 Sq. Ft'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqft,
    ],
    notes: 'Standard HP settlement: 1 Acre = 5 Bighas = 100 Biswas. Kangra settlement uses standard Punjab Kanal-Marla system.',
  },

  Rajasthan: {
    state: 'Rajasthan',
    code: 'RJ',
    region: 'North',
    capital: 'Jaipur',
    revenuePortal: 'Apna Khata / E-Dharti Rajasthan',
    primaryUnits: ['Pucca Bigha', 'Kacha Bigha', 'Biswa', 'Biswansi', 'Hectares', 'Acres', 'Sq. Yards (Gaj)'],
    units: [
      createUnit('bigha_pucca_rj', 'Pucca Bigha (Rajasthan)', 'पक्का बीघा', 27225, '1 Pucca Bigha = 165×165 ft (55×55 yds) = 3025 Sq. Yds = 27225 Sq. Ft = 2529.285 m²'),
      createUnit('bigha_kacha_rj', 'Kacha Bigha (Rajasthan)', 'कच्चा बीघा', 17424, '1 Kacha Bigha = 1936 Sq. Yds = 17424 Sq. Ft = 1618.74 m² = 0.40 Acre'),
      createUnit('biswa_rj', 'Biswa', 'बिस्वा', 1361.25, '1 Pucca Bigha = 20 Biswa; 1 Biswa = 1361.25 Sq. Ft = 151.25 Sq. Yds'),
      createUnit('biswansi_rj', 'Biswansi', 'बिस्वांसी', 68.0625, '1 Biswa = 20 Biswansi = 68.06 Sq. Ft'),
      BASE_UNITS.hectare,
      BASE_UNITS.acre,
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
    ],
    notes: 'Rajasthan Land Revenue Act: 1 Hectare = 3.9536 Pucca Bighas. 1 Acre = 1.6 Pucca Bighas = 2.5 Kacha Bighas.',
  },

  // ================= EAST INDIA =================
  Bihar: {
    state: 'Bihar',
    code: 'BR',
    region: 'East',
    capital: 'Patna',
    revenuePortal: 'Biharbhumi / Land Records Bihar',
    primaryUnits: ['Bigha (Bihar)', 'Kattha', 'Dhur', 'Dhurki', 'Acres', 'Decimal', 'Sq. Feet'],
    units: [
      createUnit('bigha_bihar', 'Bihar Bigha', 'बीघा', 27225, '1 Bigha = 20 Kattha = 3025 Sq. Yds = 27225 Sq. Ft = 2529.285 m²'),
      createUnit('kattha_bihar', 'Kattha / Katha', 'कट्ठा', 1361.25, '1 Bigha = 20 Kattha; 1 Kattha = 20 Dhur = 1361.25 Sq. Ft = 126.464 m²'),
      createUnit('dhur_bihar', 'Dhur', 'धूर', 68.0625, '1 Kattha = 20 Dhur; 1 Dhur = 20 Dhurki = 68.06 Sq. Ft = 6.323 m² (measured by laggi of 5.5 to 6.5 haath)'),
      createUnit('dhurki_bihar', 'Dhurki', 'धुरकी', 3.4031, '1 Dhur = 20 Dhurki = 3.403 Sq. Ft = 0.316 m²'),
      createUnit('decimal_bihar', 'Decimal / Dismil', 'डिसमिल', 435.6, '1 Decimal = 1/100 Acre = 435.6 Sq. Ft = 40.468 m²'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
    ],
    notes: 'Measured with a pole (Laggi/Latha) varying by district (usually 5.5 to 6.5 cubits/haath). In standard cadastral surveys: 1 Acre = 1.6 Bigha = 32 Kattha = 100 Decimals.',
  },

  Jharkhand: {
    state: 'Jharkhand',
    code: 'JH',
    region: 'East',
    capital: 'Ranchi',
    revenuePortal: 'Jharbhoomi / Jharkhand Land Records',
    primaryUnits: ['Bigha', 'Kattha', 'Dhur', 'Decimal / Dismil', 'Acres', 'Hectares'],
    units: [
      createUnit('bigha_jharkhand', 'Jharkhand Bigha', 'बीघा', 27225, '1 Bigha = 20 Kattha = 27225 Sq. Ft = 2529.285 m²'),
      createUnit('kattha_jharkhand', 'Kattha', 'कट्ठा', 1361.25, '1 Kattha = 20 Dhur = 1361.25 Sq. Ft'),
      createUnit('dhur_jharkhand', 'Dhur', 'धूर', 68.0625, '1 Dhur = 68.06 Sq. Ft'),
      createUnit('dismil_jharkhand', 'Dismil / Decimal', 'डिसमिल', 435.6, '1 Dismil = 435.6 Sq. Ft = 1 Cent = 40.468 m²'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqft,
    ],
    notes: 'Chota Nagpur Tenancy (CNT) and Santhal Parganas Tenancy (SPT) acts predominantly record land records in Acres and Dismil (Decimals).',
  },

  'West Bengal': {
    state: 'West Bengal',
    code: 'WB',
    region: 'East',
    capital: 'Kolkata',
    revenuePortal: 'Banglarbhumi / WB Land & Land Reforms',
    primaryUnits: ['Bigha (Bengal)', 'Cottah (Katha)', 'Chhatak', 'Satak (Decimal)', 'Acres', 'Sq. Feet'],
    units: [
      createUnit('bigha_wb', 'Bengal Bigha', 'বিঘা (बीघा)', 14400, '1 Bigha = 20 Cottahs = 1600 Sq. Yds = 14400 Sq. Ft = 1337.804 m² (1 Acre = 3.025 Bighas)'),
      createUnit('cottah_wb', 'Cottah / Katha', 'কাঠা (कट्ठा)', 720, '1 Bigha = 20 Cottahs; 1 Cottah = 16 Chhataks = 80 Sq. Yds = 720 Sq. Ft = 66.890 m²'),
      createUnit('chhatak_wb', 'Chhatak', 'ছটাক (छटाक)', 45, '1 Cottah = 16 Chhataks; 1 Chhatak = 5 Sq. Yds = 45 Sq. Ft = 4.1806 m²'),
      createUnit('satak_wb', 'Satak / Decimal', 'শতক / ডেসিমেল', 435.6, '1 Satak = 1/100 Acre = 435.6 Sq. Ft = 40.468 m² = 9.68 Chhataks'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
    ],
    notes: 'Kolkata Metropolitan Area and Bengal districts record residential and rural plots in Cottah (720 sq ft) and Satak (435.6 sq ft). 1 Acre = 3 Bighas 8 Cottahs.',
  },

  Odisha: {
    state: 'Odisha',
    code: 'OD',
    region: 'East',
    capital: 'Bhubaneswar',
    revenuePortal: 'Bhulekh Odisha / Revenue Department',
    primaryUnits: ['Guntha', 'Maana', 'Bigha (Odisha)', 'Decimal', 'Acres', 'Hectares'],
    units: [
      createUnit('guntha_odisha', 'Guntha (Odisha)', 'ଗୁଣ୍ଠ (गुंठा)', 435.6, 'In Odisha cadastral revenue: 1 Guntha = 1 Decimal = 435.6 Sq. Ft = 48.4 Sq. Yds = 40.468 m²'),
      createUnit('maana_odisha', 'Maana', 'ମାଣ (माण)', 10890, '1 Maana = 25 Gunthas = 0.25 Acre = 10,890 Sq. Ft = 1011.71 m²'),
      createUnit('bigha_odisha', 'Odisha Bigha', 'ବିଘା (बीघा)', 27225, '1 Bigha = 2.5 Maana = 62.5 Gunthas = 27,225 Sq. Ft = 2529.28 m²'),
      createUnit('biswas_odisha', 'Biswas (Odisha)', 'ବିଶ୍ବାସ', 21.78, '1 Guntha = 20 Biswas = 21.78 Sq. Ft = 2.023 m²'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
    ],
    notes: 'Odisha Survey & Settlement system uses Guntha (= 1 Decimal = 435.6 sq ft) and Maana (= 25 Gunthas = 0.25 Acre). 4 Maanas = 1 Acre.',
  },

  // ================= NORTH-EAST INDIA =================
  Assam: {
    state: 'Assam',
    code: 'AS',
    region: 'North-East',
    capital: 'Dispur',
    revenuePortal: 'Dharitree / ILRMS Assam',
    primaryUnits: ['Bigha (Assam)', 'Katha (Assam)', 'Lessa', 'Pura', 'Acres', 'Sq. Feet'],
    units: [
      createUnit('bigha_assam', 'Assam Bigha', 'বিঘা (बीघा)', 14400, '1 Bigha = 5 Kathas = 14400 Sq. Ft = 1337.804 m² = 1600 Sq. Yds'),
      createUnit('katha_assam', 'Assam Katha', 'কঠা (कथा)', 2880, '1 Bigha = 5 Kathas; 1 Katha = 20 Lessas = 2880 Sq. Ft = 267.56 m² = 320 Sq. Yds'),
      createUnit('lessa_assam', 'Lessa', 'লেচা (लेसा)', 144, '1 Katha = 20 Lessas; 1 Lessa = 144 Sq. Ft = 13.378 m² = 16 Sq. Yds'),
      createUnit('pura_assam', 'Pura', 'পুৰা (पुरा)', 57600, '1 Pura = 4 Bighas = 57,600 Sq. Ft = 1.3223 Acres = 5351.22 m²'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqft,
    ],
    notes: 'Assam Land Records (Dharitree) official denomination: 1 Bigha = 5 Katha = 100 Lessa. 1 Acre = 3 Bighas, 0 Katha, 7.5 Lessas (3.025 Bighas).',
  },

  Tripura: {
    state: 'Tripura',
    code: 'TR',
    region: 'North-East',
    capital: 'Agartala',
    revenuePortal: 'Jami Tripura / Land Records',
    primaryUnits: ['Kani', 'Ganda', 'Kara', 'Kranta', 'Dron', 'Acres'],
    units: [
      createUnit('kani_tripura', 'Kani', 'কানি (कानी)', 17424, '1 Kani = 20 Gandas = 17,424 Sq. Ft = 1618.74 m² = 0.40 Acre (2.5 Kanis = 1 Acre)'),
      createUnit('ganda_tripura', 'Ganda', 'গণ্ডা (गंडा)', 871.2, '1 Kani = 20 Gandas; 1 Ganda = 4 Karas = 871.2 Sq. Ft = 80.937 m²'),
      createUnit('kara_tripura', 'Kara', 'কড়া (कड़ा)', 217.8, '1 Ganda = 4 Karas; 1 Kara = 3 Krantas = 217.8 Sq. Ft = 20.234 m²'),
      createUnit('kranta_tripura', 'Kranta', 'ক্রান্তি (क्रांति)', 72.6, '1 Kara = 3 Krantas; 1 Kranta = 72.6 Sq. Ft = 6.745 m²'),
      createUnit('dron_tripura', 'Dron', 'দ্রোণ (द्रोण)', 278784, '1 Dron = 16 Kanis = 278,784 Sq. Ft = 6.40 Acres = 25,899.88 m²'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqft,
    ],
    notes: 'Tripura Land Revenue & Land Reforms Act: 1 Dron = 16 Kanis; 1 Kani = 20 Gandas; 1 Ganda = 4 Karas; 1 Kara = 3 Krantas; 1 Kranta = 20 Til.',
  },

  Meghalaya: {
    state: 'Meghalaya',
    code: 'ML',
    region: 'North-East',
    capital: 'Shillong',
    revenuePortal: 'Meghalaya Revenue & Disaster Management',
    primaryUnits: ['Bigha', 'Katha', 'Acres', 'Hectares', 'Sq. Feet'],
    units: [
      createUnit('bigha_meghalaya', 'Bigha', 'Bigha', 14400, 'Plain & border revenue circles: 1 Bigha = 14,400 Sq. Ft = 1337.8 m²'),
      createUnit('katha_meghalaya', 'Katha', 'Katha', 2880, '1 Katha = 2,880 Sq. Ft = 267.56 m²'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqft,
      BASE_UNITS.sqm,
    ],
    notes: 'Tribal land governed under Autonomous District Councils (KHADC, JHADC, GHADC) with customary land records alongside standard cadastral Acres and Hectares.',
  },

  Manipur: {
    state: 'Manipur',
    code: 'MN',
    region: 'North-East',
    capital: 'Imphal',
    revenuePortal: 'Loucha Pathap / Manipur Land Records',
    primaryUnits: ['Pari', 'Sangam', 'Loushal', 'Acres', 'Hectares'],
    units: [
      createUnit('pari_manipur', 'Pari', 'পাৰী (पारी)', 43560, '1 Pari = 1 Acre = 4 Sangam = 43,560 Sq. Ft = 4046.856 m²'),
      createUnit('sangam_manipur', 'Sangam', 'চাংগম (सांगम)', 10890, '1 Pari = 4 Sangam; 1 Sangam = 10,890 Sq. Ft = 1011.71 m² = 0.25 Acre'),
      createUnit('loushal_manipur', 'Loushal', 'লৌশল (लौशल)', 2722.5, '1 Sangam = 4 Loushal; 1 Loushal = 2,722.5 Sq. Ft = 252.93 m² = 0.0625 Acre'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqft,
    ],
    notes: 'Manipur valley revenue cadastre (Imphal East, West, Thoubal, Bishnupur) uses Pari (Acre) divided into 4 Sangams and 16 Loushals.',
  },

  Mizoram: {
    state: 'Mizoram',
    code: 'MZ',
    region: 'North-East',
    capital: 'Aizawl',
    revenuePortal: 'Land Revenue & Settlement Mizoram',
    primaryUnits: ['Tin Land', 'Bigha', 'Acres', 'Hectares', 'Sq. Feet'],
    units: [
      createUnit('tin_land', 'Tin Land', 'Tin Hmun', 43560, 'Customary Mizo land capacity measurement (~1 Acre = 43,560 Sq. Ft)'),
      createUnit('bigha_mizoram', 'Bigha', 'Bigha', 14400, '1 Bigha = 14,400 Sq. Ft = 1337.8 m²'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqft,
      BASE_UNITS.sqm,
    ],
    notes: 'Mizoram Land Revenue & Settlement Department uses Periodic Patta (PP) and Land Settlement Certificates (LSC) in Hectares and Acres.',
  },

  Nagaland: {
    state: 'Nagaland',
    code: 'NL',
    region: 'North-East',
    capital: 'Kohima',
    revenuePortal: 'Nagaland Land Records & Survey',
    primaryUnits: ['Acres', 'Hectares', 'Sq. Feet', 'Sq. Meters'],
    units: [
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqft,
      BASE_UNITS.sqm,
    ],
    notes: 'Article 371A safeguards customary land ownership. Government surveys and urban towns (Dimapur, Kohima) record in Acres and Hectares.',
  },

  'Arunachal Pradesh': {
    state: 'Arunachal Pradesh',
    code: 'AR',
    region: 'North-East',
    capital: 'Itanagar',
    revenuePortal: 'Directorate of Land Management',
    primaryUnits: ['Acres', 'Hectares', 'Bigha', 'Sq. Meters', 'Sq. Feet'],
    units: [
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      createUnit('bigha_arunachal', 'Bigha', 'बीघा', 14400, 'Foot-hill administrative belts: 1 Bigha = 14,400 Sq. Ft = 1337.8 m²'),
      BASE_UNITS.sqm,
      BASE_UNITS.sqft,
    ],
    notes: 'Land Possession Certificates (LPC) are issued by District Administration in Hectares, Acres, and Square Meters.',
  },

  Sikkim: {
    state: 'Sikkim',
    code: 'SK',
    region: 'North-East',
    capital: 'Gangtok',
    revenuePortal: 'Land Revenue & Disaster Management Sikkim',
    primaryUnits: ['Bigha', 'Kattha', 'Acres', 'Hectares', 'Sq. Feet'],
    units: [
      createUnit('bigha_sikkim', 'Bigha', 'बीघा', 14400, '1 Bigha = 14,400 Sq. Ft = 1337.804 m² = 5 Kathas'),
      createUnit('kattha_sikkim', 'Kattha', 'कट्ठा', 2880, '1 Kattha = 2,880 Sq. Ft = 267.56 m²'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqft,
    ],
    notes: 'Sikkim cadastral maps follow the metric and colonial surveys: 1 Acre = 3.025 Bighas.',
  },

  // ================= CENTRAL INDIA =================
  'Madhya Pradesh': {
    state: 'Madhya Pradesh',
    code: 'MP',
    region: 'Central',
    capital: 'Bhopal',
    revenuePortal: 'MP Bhulekh / MP Land Records',
    primaryUnits: ['Bigha (Standard Pucca)', 'Bigha (Gwalior)', 'Biswa', 'Biswansi', 'Hectares', 'Acres', 'Sq. Feet'],
    units: [
      createUnit('bigha_pucca_mp', 'Standard Pucca Bigha', 'पक्का बीघा', 27225, 'Official revenue standard: 1 Pucca Bigha = 27,225 Sq. Ft = 3025 Sq. Yds = 2529.285 m² = 20 Biswa'),
      createUnit('bigha_gwalior_mp', 'Gwalior / Central Bigha', 'ग्वालियर बीघा', 20000, 'Customary northern MP: 1 Bigha = 20,000 Sq. Ft = 1858.06 m² = 20 Biswa'),
      createUnit('bigha_malwa_mp', 'Malwa / Indore Bigha', 'मालवा बीघा', 17424, 'Malwa region: 1 Bigha = 17,424 Sq. Ft = 1618.74 m² = 0.40 Acre'),
      createUnit('biswa_mp', 'Biswa (MP)', 'बिस्वा', 1361.25, '1 Pucca Bigha = 20 Biswa; 1 Biswa = 1361.25 Sq. Ft = 126.46 m²'),
      createUnit('biswansi_mp', 'Biswansi (MP)', 'बिस्वांसी', 68.0625, '1 Biswa = 20 Biswansi = 68.06 Sq. Ft'),
      BASE_UNITS.hectare,
      BASE_UNITS.acre,
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
    ],
    notes: 'MP Land Revenue Code (MPLRC) records agricultural holdings officially in Hectares and Ares, with local rural conveyancing in Bigha and Biswa.',
  },

  Chhattisgarh: {
    state: 'Chhattisgarh',
    code: 'CG',
    region: 'Central',
    capital: 'Raipur',
    revenuePortal: 'Bhuiyan / CG Land Records',
    primaryUnits: ['Bigha', 'Kattha', 'Dhur', 'Dismil / Decimal', 'Acres', 'Hectares'],
    units: [
      createUnit('bigha_cg', 'Chhattisgarh Bigha', 'बीघा', 27225, '1 Bigha = 20 Kattha = 27,225 Sq. Ft = 2529.285 m²'),
      createUnit('kattha_cg', 'Kattha (CG)', 'कट्ठा', 1361.25, '1 Kattha = 20 Dhur = 1361.25 Sq. Ft = 126.46 m²'),
      createUnit('dhur_cg', 'Dhur (CG)', 'धूर', 68.0625, '1 Dhur = 68.06 Sq. Ft = 6.32 m²'),
      createUnit('dismil_cg', 'Dismil / Decimal', 'डिसमिल', 435.6, '1 Dismil = 435.6 Sq. Ft = 1 Cent = 40.468 m² (100 Dismil = 1 Acre)'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqft,
    ],
    notes: 'Chhattisgarh Bhuiyan portal records Khasra areas in Hectares and Dismils. 1 Hectare = 2.471 Acres = 247.1 Dismils.',
  },

  // ================= WEST INDIA =================
  Maharashtra: {
    state: 'Maharashtra',
    code: 'MH',
    region: 'West',
    capital: 'Mumbai',
    revenuePortal: 'Mahabhulekh / Aapli Chawdi (7/12 & 8A)',
    primaryUnits: ['Gunta / Guntha', 'Acres', 'Hectares', 'Ares', 'Sq. Meters', 'Sq. Feet'],
    units: [
      BASE_UNITS.gunta,
      BASE_UNITS.acre,
      BASE_UNITS.are,
      BASE_UNITS.hectare,
      createUnit('bigha_mh', 'Maharashtra Bigha (Customary)', 'बीघा', 27225, 'Traditional Vidarbha/Khandesh: 1 Bigha = 25 Guntas = 27,225 Sq. Ft'),
      BASE_UNITS.sqm,
      BASE_UNITS.sqft,
    ],
    notes: 'Maharashtra Land Revenue Code, 1966: 7/12 extracts record in Hectare-Are-Square Meter. 1 Hectare = 100 Ares = 2.471 Acres. 1 Are = 1 Gunta (approximately 100 m² vs 101.17 m²).',
  },

  Gujarat: {
    state: 'Gujarat',
    code: 'GJ',
    region: 'West',
    capital: 'Gandhinagar',
    revenuePortal: 'AnyRoR Gujarat (7/12 & 8A)',
    primaryUnits: ['Bigha (Gujarat)', 'Vassa', 'Gunta', 'Sq. Yards (Vaar)', 'Acres', 'Hectares', 'Sq. Meters'],
    units: [
      createUnit('bigha_gujarat', 'Gujarat Bigha (Standard)', 'વીઘા (बीघा)', 17424, '1 Bigha = 16 Vassa = 1936 Sq. Yds (Vaar) = 17,424 Sq. Ft = 1618.74 m² = 0.40 Acre'),
      createUnit('vassa_gujarat', 'Vassa', 'વસો (वसा)', 1089, '1 Bigha = 16 Vassa; 1 Vassa = 121 Sq. Yds = 1089 Sq. Ft = 101.17 m² (equal to 1 Gunta)'),
      createUnit('bigha_kacha_gj', 'Kacha Bigha (Saurashtra)', 'કાચું વીઘું', 12100, 'Customary Saurashtra/Kutch: 1 Kacha Bigha = 12,100 Sq. Ft = 1124.12 m²'),
      createUnit('vaar_gj', 'Vaar (Square Yard)', 'વાર (गज)', 9, '1 Vaar = 9 Sq. Feet = 0.8361 m²'),
      BASE_UNITS.gunta,
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqm,
      BASE_UNITS.sqft,
    ],
    notes: 'Gujarat revenue cadastre (AnyRoR): 1 Acre = 2.5 Standard Bighas = 40 Vassa/Guntas. 1 Bigha = 16 Vassa.',
  },

  Goa: {
    state: 'Goa',
    code: 'GA',
    region: 'West',
    capital: 'Panaji',
    revenuePortal: 'Directorate of Settlement & Land Records (DSLR Goa) / Dharani Goa',
    primaryUnits: ['Sq. Meters', 'Hectares', 'Ares', 'Guntas', 'Cents', 'Acres'],
    units: [
      BASE_UNITS.sqm,
      BASE_UNITS.are,
      BASE_UNITS.hectare,
      BASE_UNITS.gunta,
      BASE_UNITS.cent,
      BASE_UNITS.acre,
      BASE_UNITS.sqft,
    ],
    notes: 'Cadastral records under Portuguese & Goa Land Revenue Code are natively maintained in Metric System (Square Meters and Hectares/Ares).',
  },

  // ================= SOUTH INDIA =================
  'Andhra Pradesh': {
    state: 'Andhra Pradesh',
    code: 'AP',
    region: 'South',
    capital: 'Amaravati',
    revenuePortal: 'Meebhoomi (Adangal & 1-B ROR)',
    primaryUnits: ['Acres', 'Cents', 'Guntas', 'Ankanams', 'Sq. Yards (Gajam)', 'Sq. Feet'],
    units: [
      BASE_UNITS.acre,
      BASE_UNITS.cent,
      BASE_UNITS.gunta,
      createUnit('ankanam_ap', 'Ankanam (Nellore / Rayalaseema)', 'అంకణం', 72, '1 Ankanam = 72 Sq. Ft = 8 Sq. Yds = 6.689 m² (Rayalaseema standard; 1 Cent = 6.05 Ankanams)'),
      createUnit('ankanam_coastal', 'Ankanam (Coastal Tirupati)', 'అంకణం (చిన్నది)', 36, '1 Coastal Ankanam = 36 Sq. Ft = 4 Sq. Yds = 3.344 m²'),
      createUnit('gajam_ap', 'Gajam (Sq. Yard)', 'గజం', 9, '1 Gajam = 9 Sq. Ft = 0.8361 m²'),
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
      BASE_UNITS.hectare,
    ],
    notes: 'Meebhoomi cadastral records: 1 Acre = 100 Cents = 4840 Sq. Yards. 1 Cent = 48.4 Sq. Yards = 435.6 Sq. Ft. Rayalaseema heavily uses Ankanams.',
  },

  Telangana: {
    state: 'Telangana',
    code: 'TG',
    region: 'South',
    capital: 'Hyderabad',
    revenuePortal: 'Dharani Portal (Pattadar Passbook & RoR)',
    primaryUnits: ['Acres', 'Guntas', 'Sq. Yards (Gajam)', 'Sq. Feet', 'Cents', 'Hectares'],
    units: [
      BASE_UNITS.acre,
      BASE_UNITS.gunta,
      createUnit('guntadiv_tg', 'Gunta Half / Quarter', 'పావు గుంట', 272.25, '1/4 Gunta = 272.25 Sq. Ft = 30.25 Sq. Yds'),
      createUnit('gajam_tg', 'Gajam (Sq. Yard)', 'గజం', 9, '1 Gajam = 9 Sq. Ft = 0.8361 m²'),
      BASE_UNITS.cent,
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
      BASE_UNITS.hectare,
    ],
    notes: 'Dharani official cadastre strictly standardizes on Acres and Guntas. 1 Acre = 40 Guntas. 1 Gunta = 121 Sq. Yards = 1089 Sq. Ft = 101.17 m².',
  },

  Karnataka: {
    state: 'Karnataka',
    code: 'KA',
    region: 'South',
    capital: 'Bengaluru',
    revenuePortal: 'Bhoomi Karnataka (RTC / Pahani)',
    primaryUnits: ['Acres', 'Guntas', 'Sq. Feet', 'Sq. Yards', 'Sq. Meters', 'Cents'],
    units: [
      BASE_UNITS.acre,
      BASE_UNITS.gunta,
      createUnit('aane_ka', 'Aane / Anna (1/16 Gunta)', 'ಆಣೆ', 68.0625, '1 Gunta = 16 Aanes = 68.06 Sq. Ft = 7.56 Sq. Yds'),
      BASE_UNITS.cent,
      BASE_UNITS.sqft,
      BASE_UNITS.sqyd,
      BASE_UNITS.sqm,
      BASE_UNITS.hectare,
    ],
    notes: 'Bhoomi RTCs record agricultural land in Acre-Gunta-Aane. Coastal Karnataka (Dakshina Kannada, Udupi) also records in Cents (1 Acre = 100 Cents).',
  },

  'Tamil Nadu': {
    state: 'Tamil Nadu',
    code: 'TN',
    region: 'South',
    capital: 'Chennai',
    revenuePortal: 'Anywhere Anytime e-Services (Patta / Chitta / FMB)',
    primaryUnits: ['Grounds', 'Cents', 'Acres', 'Kuzhi', 'Kani', 'Sq. Feet'],
    units: [
      createUnit('ground_tn', 'Ground (Manai)', 'மனை (கிரவுண்ட்)', 2400, '1 Ground = 2400 Sq. Ft = 266.67 Sq. Yds = 222.967 m² (1 Acre = 18.15 Grounds)'),
      BASE_UNITS.cent,
      BASE_UNITS.acre,
      createUnit('kuzhi_tn', 'Kuzhi', 'குழி', 144, '1 Kuzhi = 144 Sq. Ft = 16 Sq. Yds = 13.378 m² (100 Kuzhi = 1 Kani = 14,400 Sq. Ft or 1.32 Ac depending on district)'),
      createUnit('kani_tn', 'Kani', 'காணி', 57499.2, 'Official revenue standard: 1 Kani = 1.32 Acres = 57,499.2 Sq. Ft = 24 Grounds = 5341.8 m²'),
      BASE_UNITS.sqft,
      BASE_UNITS.sqyd,
      BASE_UNITS.hectare,
    ],
    notes: 'Chennai & urban Tamil Nadu land transacts in Grounds (2400 sq ft). Rural Patta/Chitta records in Hectare-Are and Acre-Cents. 1 Acre = 100 Cents = 18.15 Grounds.',
  },

  Kerala: {
    state: 'Kerala',
    code: 'KL',
    region: 'South',
    capital: 'Thiruvananthapuram',
    revenuePortal: 'e-Rekha / Bhoomi Kerala',
    primaryUnits: ['Cents', 'Ares', 'Acres', 'Hectares', 'Perch', 'Sq. Feet'],
    units: [
      BASE_UNITS.cent,
      BASE_UNITS.are,
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      createUnit('perch_kl', 'Perch / Square Rod', 'പെർച്ച്', 272.25, '1 Perch = 272.25 Sq. Ft = 25.293 m² = 1/160 Acre'),
      BASE_UNITS.sqft,
      BASE_UNITS.sqm,
    ],
    notes: 'e-Rekha maintains land records in Hectare-Are-Sq. Meter and Acre-Cents. Real estate widely priced per Cent (435.6 sq ft). 1 Are = 2.471 Cents.',
  },

  // ================= UNION TERRITORIES =================
  'Delhi (NCT)': {
    state: 'Delhi (NCT)',
    code: 'DL',
    region: 'Union Territory',
    capital: 'New Delhi',
    revenuePortal: 'Delhi Revenue Bhulekh',
    primaryUnits: ['Pucca Bigha', 'Biswa', 'Sq. Yards (Gaj)', 'Sq. Meters', 'Acres', 'Sq. Feet'],
    units: [
      createUnit('bigha_pucca_dl', 'Pucca Bigha (Delhi)', 'पक्का बीघा', 27225, '1 Bigha = 20 Biswa = 3025 Sq. Yds (Gaj) = 27225 Sq. Ft = 2529.285 m²'),
      createUnit('biswa_dl', 'Biswa (Delhi)', 'बिस्वा', 1361.25, '1 Biswa = 151.25 Sq. Yds = 1361.25 Sq. Ft = 126.46 m²'),
      createUnit('biswansi_dl', 'Biswansi', 'बिस्वांसी', 68.0625, '1 Biswa = 20 Biswansi = 68.06 Sq. Ft'),
      createUnit('gaj_dl', 'Gaj (Square Yard)', 'गज', 9, '1 Gaj = 9 Sq. Ft = 0.8361 m² (Universal Delhi property pricing unit)'),
      BASE_UNITS.acre,
      BASE_UNITS.sqyd,
      BASE_UNITS.sqm,
      BASE_UNITS.sqft,
    ],
    notes: 'Rural villages (lal dora & extended abadi) surveyed in Bigha-Biswa. Urban residential plots transacted in Gaj (Sq. Yards) and Sq. Meters.',
  },

  'Jammu and Kashmir': {
    state: 'Jammu and Kashmir',
    code: 'JK',
    region: 'Union Territory',
    capital: 'Srinagar / Jammu',
    revenuePortal: 'JK Land Records / Aapki Zameen Aapki Nigrani',
    primaryUnits: ['Kanal', 'Marla', 'Sarsahi', 'Karam', 'Acres', 'Sq. Feet'],
    units: [
      BASE_UNITS.acre,
      createUnit('kanal_jk', 'Kanal (JK)', 'कनाल / کنال', 5445, '1 Acre = 8 Kanals; 1 Kanal = 20 Marlas = 605 Sq. Yds = 5445 Sq. Ft = 505.857 m²'),
      createUnit('marla_jk', 'Marla (JK)', 'मरला / مرلہ', 272.25, '1 Kanal = 20 Marlas; 1 Marla = 30.25 Sq. Yds = 272.25 Sq. Ft = 25.293 m²'),
      createUnit('sarsahi_jk', 'Sarsahi', 'सरसाही', 30.25, '1 Marla = 9 Sarsahi = 30.25 Sq. Ft = 2.81 m²'),
      createUnit('karam_jk', 'Square Karam', 'करम', 30.25, '1 Karam = 5.5 ft (66 in); 1 Sq. Karam = 30.25 Sq. Ft'),
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
      BASE_UNITS.hectare,
    ],
    notes: 'Cadastral records in Urdu script use the Kanal-Marla system. 1 Acre = 8 Kanals = 160 Marlas = 1,440 Sarsahis.',
  },

  Ladakh: {
    state: 'Ladakh',
    code: 'LA',
    region: 'Union Territory',
    capital: 'Leh',
    revenuePortal: 'Ladakh Revenue Department',
    primaryUnits: ['Kanal', 'Marla', 'Khal', 'Acres', 'Sq. Feet'],
    units: [
      BASE_UNITS.acre,
      createUnit('kanal_la', 'Kanal', 'Kanal', 5445, '1 Kanal = 20 Marlas = 5445 Sq. Ft = 505.857 m²'),
      createUnit('marla_la', 'Marla', 'Marla', 272.25, '1 Marla = 272.25 Sq. Ft = 25.293 m²'),
      createUnit('khal_la', 'Khal', 'Khal', 2722.5, 'Customary barley-seed land measure (~0.5 Kanal = 2722.5 Sq. Ft)'),
      BASE_UNITS.sqft,
      BASE_UNITS.sqm,
      BASE_UNITS.hectare,
    ],
    notes: 'High-altitude agricultural settlements in Leh and Kargil use Kanal-Marla alongside traditional seed capacities.',
  },

  Chandigarh: {
    state: 'Chandigarh',
    code: 'CH',
    region: 'Union Territory',
    capital: 'Chandigarh',
    revenuePortal: 'Chandigarh Administration Land Records',
    primaryUnits: ['Kanal', 'Marla', 'Sq. Yards (Gaj)', 'Acres', 'Sq. Feet'],
    units: [
      createUnit('kanal_ch', 'Kanal', 'ਕਨਾਲ / कनाल', 5445, '1 Kanal = 20 Marlas = 5445 Sq. Ft = 505.857 m²'),
      createUnit('marla_ch', 'Marla', 'ਮਰਲਾ / मरला', 272.25, '1 Marla = 272.25 Sq. Ft = 25.293 m²'),
      BASE_UNITS.sqyd,
      BASE_UNITS.acre,
      BASE_UNITS.sqft,
    ],
    notes: 'Urban Chandigarh residential sectors are classified into 1-Kanal, 2-Kanal, 10-Marla, and 5-Marla plots.',
  },

  Puducherry: {
    state: 'Puducherry',
    code: 'PY',
    region: 'Union Territory',
    capital: 'Puducherry',
    revenuePortal: 'Nilamagal / Puducherry Land Records',
    primaryUnits: ['Kuzhi', 'Kani', 'Cents', 'Grounds', 'Acres', 'Hectares'],
    units: [
      createUnit('kuzhi_py', 'Kuzhi', 'குழி', 144, '1 Kuzhi = 144 Sq. Ft = 13.378 m²'),
      createUnit('kani_py', 'Kani', 'காணி', 57499.2, '1 Kani = 100 Kuzhi = 1.32 Acres = 57,499.2 Sq. Ft'),
      BASE_UNITS.ground,
      BASE_UNITS.cent,
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqft,
    ],
    notes: 'French colonial cadastral maps blended with Tamil traditional Kuzhi/Kani and modern Metric Ares/Hectares.',
  },

  'Andaman and Nicobar Islands': {
    state: 'Andaman and Nicobar Islands',
    code: 'AN',
    region: 'Union Territory',
    capital: 'Port Blair',
    revenuePortal: 'Andaman Revenue Department',
    primaryUnits: ['Hectares', 'Ares', 'Acres', 'Cents', 'Sq. Meters', 'Sq. Feet'],
    units: [
      BASE_UNITS.hectare,
      BASE_UNITS.are,
      BASE_UNITS.acre,
      BASE_UNITS.cent,
      BASE_UNITS.sqm,
      BASE_UNITS.sqft,
    ],
    notes: 'Revenue records maintained primarily in Metric Hectares and Ares, with local conveyance in Acres and Cents.',
  },

  'Dadra and Nagar Haveli and Daman and Diu': {
    state: 'Dadra and Nagar Haveli and Daman and Diu',
    code: 'DN',
    region: 'Union Territory',
    capital: 'Daman',
    revenuePortal: 'Daman & Diu e-Land Records',
    primaryUnits: ['Guntas', 'Vassa', 'Bigha (17,424 sq ft)', 'Acres', 'Hectares', 'Sq. Meters'],
    units: [
      BASE_UNITS.gunta,
      createUnit('vassa_dn', 'Vassa', 'વસો', 1089, '1 Vassa = 1089 Sq. Ft = 1 Gunta'),
      createUnit('bigha_dn', 'Bigha', 'વીઘા', 17424, '1 Bigha = 16 Vassa = 17,424 Sq. Ft = 1618.74 m²'),
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqm,
      BASE_UNITS.sqft,
    ],
    notes: 'Shares western coastal standards with Gujarat and Maharashtra (Guntas, Vassa, and Bigha).',
  },

  Lakshadweep: {
    state: 'Lakshadweep',
    code: 'LD',
    region: 'Union Territory',
    capital: 'Kavaratti',
    revenuePortal: 'Lakshadweep Land Records',
    primaryUnits: ['Cents', 'Ares', 'Acres', 'Hectares', 'Sq. Meters'],
    units: [
      BASE_UNITS.cent,
      BASE_UNITS.are,
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.sqm,
      BASE_UNITS.sqft,
    ],
    notes: 'Island customary tenures (Jenmam / Pandaram lands) surveyed in Cents and Metric Ares/Sq. Meters.',
  },

  // ================= NATIONAL / ALL-INDIA =================
  'All-India': {
    state: 'All-India',
    code: 'IN',
    region: 'National',
    capital: 'New Delhi',
    revenuePortal: 'Survey of India / DILRMP (Digital India Land Records Modernization Programme)',
    primaryUnits: ['Acres', 'Hectares', 'Cents', 'Guntas', 'Pucca Bigha', 'Kanal', 'Grounds', 'Sq. Yards', 'Sq. Feet', 'Sq. Meters'],
    units: [
      BASE_UNITS.acre,
      BASE_UNITS.hectare,
      BASE_UNITS.cent,
      BASE_UNITS.gunta,
      createUnit('bigha_pucca_std', 'Bigha (Standard Pucca)', 'पक्का बीघा', 27225, 'Standard national pucca bigha: 3025 Sq. Yds = 27,225 Sq. Ft = 2529.285 m² = 1.6 per Acre'),
      createUnit('bigha_bengal_std', 'Bigha (East / Bengal / Assam)', 'বিঘা', 14400, 'Eastern bigha: 1600 Sq. Yds = 14,400 Sq. Ft = 1337.804 m² = 3.025 per Acre'),
      createUnit('kanal_std', 'Kanal (North / Punjab / Haryana / JK)', 'कनाल', 5445, 'Northern kanal: 605 Sq. Yds = 5445 Sq. Ft = 505.857 m² = 8 per Acre'),
      createUnit('marla_std', 'Marla', 'मरला', 272.25, '1 Kanal = 20 Marlas = 272.25 Sq. Ft = 25.293 m²'),
      createUnit('ground_std', 'Ground (South / Tamil Nadu)', 'மனை (கிரவுண்ட்)', 2400, 'Southern ground: 2400 Sq. Ft = 222.967 m² = 18.15 per Acre'),
      createUnit('ankanam_std', 'Ankanam (Andhra Pradesh)', 'అంకణం', 72, 'Rayalaseema / Nellore ankanam: 72 Sq. Ft = 6.689 m²'),
      BASE_UNITS.are,
      BASE_UNITS.sqyd,
      BASE_UNITS.sqft,
      BASE_UNITS.sqm,
    ],
    notes: 'Universal standardized land survey conversions under DILRMP guidelines, unifying North (Kanal/Marla/Bigha), East (Bigha/Katha/Dhur/Satak), West (Gunta/Vassa), and South (Cent/Gunta/Ground/Ankanam).',
  },
};

/**
 * Returns an array of all Indian States and Union Territories sorted alphabetically,
 * with All-India listed at the top.
 */
export function getAllIndianStates(): IndianStateInfo[] {
  const allStates = Object.values(ALL_INDIAN_STATES_DATA);
  const national = allStates.find((s) => s.state === 'All-India');
  const others = allStates
    .filter((s) => s.state !== 'All-India')
    .sort((a, b) => a.state.localeCompare(b.state));

  return national ? [national, ...others] : others;
}

/**
 * Get the state info and cadastral units by state name.
 * Falls back to 'All-India' if the state name is not found.
 */
export function getStateUnitConfig(stateName: string): IndianStateInfo {
  if (ALL_INDIAN_STATES_DATA[stateName]) {
    return ALL_INDIAN_STATES_DATA[stateName];
  }
  // Case-insensitive / alias match
  const lower = stateName.toLowerCase().trim();
  const match = Object.values(ALL_INDIAN_STATES_DATA).find(
    (s) =>
      s.state.toLowerCase() === lower ||
      s.code.toLowerCase() === lower ||
      lower.includes(s.state.toLowerCase())
  );
  return match || ALL_INDIAN_STATES_DATA['All-India'];
}

/**
 * Convert an area from any state-specific unit into square meters.
 */
export function convertStateUnitToSqm(
  value: number,
  unitKey: string,
  stateName?: string
): number {
  if (value <= 0 || isNaN(value)) return 0;

  // Check state config first
  if (stateName && ALL_INDIAN_STATES_DATA[stateName]) {
    const stateUnit = ALL_INDIAN_STATES_DATA[stateName].units.find(
      (u) => u.key === unitKey
    );
    if (stateUnit) return value * stateUnit.sqm;
  }

  // Fallback to searching all units
  for (const s of Object.values(ALL_INDIAN_STATES_DATA)) {
    const unit = s.units.find((u) => u.key === unitKey);
    if (unit) return value * unit.sqm;
  }

  return value; // fallback 1:1 if unit unknown
}

/**
 * Convert an area in square meters into all available units for a given state.
 */
export function convertSqmToStateUnits(
  sqm: number,
  stateName: string
): Array<{
  unit: StateCadastralUnit;
  value: number;
  formatted: string;
}> {
  const safeSqm = Math.max(0, sqm);
  const stateInfo = getStateUnitConfig(stateName);

  return stateInfo.units.map((unit) => {
    const val = safeSqm / unit.sqm;
    const formatted =
      val >= 1000
        ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : val >= 1
        ? val.toFixed(3).replace(/\.?0+$/, '')
        : val.toFixed(4);

    return {
      unit,
      value: Number(val.toFixed(4)),
      formatted,
    };
  });
}
