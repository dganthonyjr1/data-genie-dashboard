// International regions/states/provinces for geo-targeting

export interface Region {
  code: string;
  name: string;
}

export interface Country {
  code: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  { code: '', name: 'Any Location' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'PH', name: 'Philippines' },
];

// US States
export const US_STATES: Region[] = [
  { code: '', name: 'Any State' },
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington D.C.' },
];

// Canadian Provinces and Territories
export const CA_PROVINCES: Region[] = [
  { code: '', name: 'Any Province' },
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

// UK Regions (Countries and major regions)
export const GB_REGIONS: Region[] = [
  { code: '', name: 'Any Region' },
  { code: 'ENG', name: 'England' },
  { code: 'SCT', name: 'Scotland' },
  { code: 'WLS', name: 'Wales' },
  { code: 'NIR', name: 'Northern Ireland' },
  { code: 'LDN', name: 'Greater London' },
  { code: 'MAN', name: 'Greater Manchester' },
  { code: 'WMD', name: 'West Midlands' },
  { code: 'MER', name: 'Merseyside' },
  { code: 'WYK', name: 'West Yorkshire' },
  { code: 'SYK', name: 'South Yorkshire' },
  { code: 'TNW', name: 'Tyne and Wear' },
  { code: 'KNT', name: 'Kent' },
  { code: 'ESX', name: 'Essex' },
  { code: 'SRY', name: 'Surrey' },
  { code: 'HRT', name: 'Hertfordshire' },
  { code: 'LAN', name: 'Lancashire' },
  { code: 'HAM', name: 'Hampshire' },
  { code: 'DEV', name: 'Devon' },
  { code: 'SOM', name: 'Somerset' },
  { code: 'NFK', name: 'Norfolk' },
  { code: 'SFK', name: 'Suffolk' },
  { code: 'OXF', name: 'Oxfordshire' },
  { code: 'CAM', name: 'Cambridgeshire' },
  { code: 'BRK', name: 'Berkshire' },
];

// Australian States and Territories
export const AU_STATES: Region[] = [
  { code: '', name: 'Any State' },
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' },
];

// German States (Bundesländer)
export const DE_STATES: Region[] = [
  { code: '', name: 'Any State' },
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bavaria (Bayern)' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BB', name: 'Brandenburg' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'HE', name: 'Hesse (Hessen)' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Lower Saxony (Niedersachsen)' },
  { code: 'NW', name: 'North Rhine-Westphalia' },
  { code: 'RP', name: 'Rhineland-Palatinate' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Saxony (Sachsen)' },
  { code: 'ST', name: 'Saxony-Anhalt' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'TH', name: 'Thuringia (Thüringen)' },
];

// French Regions
export const FR_REGIONS: Region[] = [
  { code: '', name: 'Any Region' },
  { code: 'IDF', name: 'Île-de-France (Paris)' },
  { code: 'ARA', name: 'Auvergne-Rhône-Alpes' },
  { code: 'NAQ', name: 'Nouvelle-Aquitaine' },
  { code: 'OCC', name: 'Occitanie' },
  { code: 'HDF', name: 'Hauts-de-France' },
  { code: 'GES', name: 'Grand Est' },
  { code: 'PDL', name: 'Pays de la Loire' },
  { code: 'BRE', name: 'Brittany (Bretagne)' },
  { code: 'NOR', name: 'Normandy (Normandie)' },
  { code: 'BFC', name: 'Bourgogne-Franche-Comté' },
  { code: 'CVL', name: 'Centre-Val de Loire' },
  { code: 'PAC', name: "Provence-Alpes-Côte d'Azur" },
  { code: 'COR', name: 'Corsica (Corse)' },
];

// Indian States
export const IN_STATES: Region[] = [
  { code: '', name: 'Any State' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'DL', name: 'Delhi' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TG', name: 'Telangana' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'KL', name: 'Kerala' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'PB', name: 'Punjab' },
  { code: 'HR', name: 'Haryana' },
  { code: 'BR', name: 'Bihar' },
  { code: 'OR', name: 'Odisha' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'AS', name: 'Assam' },
  { code: 'CG', name: 'Chhattisgarh' },
];

// Brazilian States
export const BR_STATES: Region[] = [
  { code: '', name: 'Any State' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'BA', name: 'Bahia' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'CE', name: 'Ceará' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'GO', name: 'Goiás' },
  { code: 'PA', name: 'Pará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
];

// Mexican States
export const MX_STATES: Region[] = [
  { code: '', name: 'Any State' },
  { code: 'CDMX', name: 'Mexico City (CDMX)' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'NL', name: 'Nuevo León' },
  { code: 'MEX', name: 'State of Mexico' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'GTO', name: 'Guanajuato' },
  { code: 'BC', name: 'Baja California' },
  { code: 'CHH', name: 'Chihuahua' },
  { code: 'TAM', name: 'Tamaulipas' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'COAH', name: 'Coahuila' },
  { code: 'SON', name: 'Sonora' },
  { code: 'QRO', name: 'Querétaro' },
  { code: 'MIC', name: 'Michoacán' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'YUC', name: 'Yucatán' },
  { code: 'QR', name: 'Quintana Roo' },
  { code: 'AGS', name: 'Aguascalientes' },
];

// Spanish Autonomous Communities
export const ES_REGIONS: Region[] = [
  { code: '', name: 'Any Region' },
  { code: 'MD', name: 'Madrid' },
  { code: 'CT', name: 'Catalonia (Catalunya)' },
  { code: 'AN', name: 'Andalusia (Andalucía)' },
  { code: 'VC', name: 'Valencia' },
  { code: 'PV', name: 'Basque Country (País Vasco)' },
  { code: 'GA', name: 'Galicia' },
  { code: 'CL', name: 'Castile and León' },
  { code: 'CM', name: 'Castilla-La Mancha' },
  { code: 'AR', name: 'Aragon' },
  { code: 'MU', name: 'Murcia' },
  { code: 'IB', name: 'Balearic Islands' },
  { code: 'CN', name: 'Canary Islands' },
  { code: 'NC', name: 'Navarre' },
  { code: 'AS', name: 'Asturias' },
  { code: 'EX', name: 'Extremadura' },
  { code: 'CB', name: 'Cantabria' },
  { code: 'RI', name: 'La Rioja' },
];

// Italian Regions
export const IT_REGIONS: Region[] = [
  { code: '', name: 'Any Region' },
  { code: 'LAZ', name: 'Lazio (Rome)' },
  { code: 'LOM', name: 'Lombardy (Milan)' },
  { code: 'CAM', name: 'Campania (Naples)' },
  { code: 'SIC', name: 'Sicily' },
  { code: 'VEN', name: 'Veneto (Venice)' },
  { code: 'PIE', name: 'Piedmont (Turin)' },
  { code: 'EMR', name: 'Emilia-Romagna' },
  { code: 'TOS', name: 'Tuscany' },
  { code: 'PUG', name: 'Puglia' },
  { code: 'CAL', name: 'Calabria' },
  { code: 'SAR', name: 'Sardinia' },
  { code: 'LIG', name: 'Liguria' },
  { code: 'FVG', name: 'Friuli Venezia Giulia' },
  { code: 'MAR', name: 'Marche' },
  { code: 'ABR', name: 'Abruzzo' },
  { code: 'TAA', name: 'Trentino-Alto Adige' },
  { code: 'UMB', name: 'Umbria' },
  { code: 'BAS', name: 'Basilicata' },
  { code: 'MOL', name: 'Molise' },
  { code: 'VDA', name: "Valle d'Aosta" },
];

// South African Provinces
export const ZA_PROVINCES: Region[] = [
  { code: '', name: 'Any Province' },
  { code: 'GP', name: 'Gauteng' },
  { code: 'WC', name: 'Western Cape' },
  { code: 'KZN', name: 'KwaZulu-Natal' },
  { code: 'EC', name: 'Eastern Cape' },
  { code: 'LP', name: 'Limpopo' },
  { code: 'MP', name: 'Mpumalanga' },
  { code: 'NW', name: 'North West' },
  { code: 'FS', name: 'Free State' },
  { code: 'NC', name: 'Northern Cape' },
];

// Japanese Regions
export const JP_REGIONS: Region[] = [
  { code: '', name: 'Any Region' },
  { code: 'TK', name: 'Tokyo' },
  { code: 'OS', name: 'Osaka' },
  { code: 'KC', name: 'Kyoto' },
  { code: 'AI', name: 'Aichi (Nagoya)' },
  { code: 'FK', name: 'Fukuoka' },
  { code: 'HK', name: 'Hokkaido' },
  { code: 'KN', name: 'Kanagawa' },
  { code: 'ST', name: 'Saitama' },
  { code: 'CB', name: 'Chiba' },
  { code: 'HG', name: 'Hyogo (Kobe)' },
  { code: 'HR', name: 'Hiroshima' },
  { code: 'MG', name: 'Miyagi (Sendai)' },
  { code: 'OK', name: 'Okinawa' },
];

// New Zealand Regions
export const NZ_REGIONS: Region[] = [
  { code: '', name: 'Any Region' },
  { code: 'AUK', name: 'Auckland' },
  { code: 'WGN', name: 'Wellington' },
  { code: 'CAN', name: 'Canterbury' },
  { code: 'WKO', name: 'Waikato' },
  { code: 'BOP', name: 'Bay of Plenty' },
  { code: 'OTA', name: 'Otago' },
  { code: 'MWT', name: 'Manawatū-Whanganui' },
  { code: 'HKB', name: "Hawke's Bay" },
  { code: 'NTL', name: 'Northland' },
  { code: 'TKI', name: 'Taranaki' },
  { code: 'STL', name: 'Southland' },
  { code: 'NSN', name: 'Nelson' },
  { code: 'MBH', name: 'Marlborough' },
];

// Irish Provinces and Counties (major)
export const IE_REGIONS: Region[] = [
  { code: '', name: 'Any Region' },
  { code: 'D', name: 'Dublin' },
  { code: 'C', name: 'Cork' },
  { code: 'G', name: 'Galway' },
  { code: 'L', name: 'Limerick' },
  { code: 'WD', name: 'Waterford' },
  { code: 'KE', name: 'Kildare' },
  { code: 'MH', name: 'Meath' },
  { code: 'WX', name: 'Wexford' },
  { code: 'KY', name: 'Kerry' },
  { code: 'CE', name: 'Clare' },
  { code: 'WW', name: 'Wicklow' },
  { code: 'MO', name: 'Mayo' },
  { code: 'TY', name: 'Tipperary' },
  { code: 'DL', name: 'Donegal' },
];

// Get regions for a country
export const getRegionsForCountry = (countryCode: string): Region[] | null => {
  switch (countryCode) {
    case 'US': return US_STATES;
    case 'CA': return CA_PROVINCES;
    case 'GB': return GB_REGIONS;
    case 'AU': return AU_STATES;
    case 'DE': return DE_STATES;
    case 'FR': return FR_REGIONS;
    case 'IN': return IN_STATES;
    case 'BR': return BR_STATES;
    case 'MX': return MX_STATES;
    case 'ES': return ES_REGIONS;
    case 'IT': return IT_REGIONS;
    case 'ZA': return ZA_PROVINCES;
    case 'JP': return JP_REGIONS;
    case 'NZ': return NZ_REGIONS;
    case 'IE': return IE_REGIONS;
    default: return null;
  }
};

// Get the label for the region dropdown based on country
export const getRegionLabel = (countryCode: string): string => {
  switch (countryCode) {
    case 'US': return 'State';
    case 'CA': return 'Province';
    case 'GB': return 'Region';
    case 'AU': return 'State/Territory';
    case 'DE': return 'State (Bundesland)';
    case 'FR': return 'Region';
    case 'IN': return 'State';
    case 'BR': return 'State';
    case 'MX': return 'State';
    case 'ES': return 'Autonomous Community';
    case 'IT': return 'Region';
    case 'ZA': return 'Province';
    case 'JP': return 'Prefecture';
    case 'NZ': return 'Region';
    case 'IE': return 'County';
    default: return 'Region';
  }
};
