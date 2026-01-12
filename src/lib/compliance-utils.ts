// US State Area Codes and Compliance Rules

// Two-party consent states (require recording consent from all parties)
export const TWO_PARTY_CONSENT_STATES = [
  'CA', 'CT', 'FL', 'IL', 'MD', 'MA', 'MI', 'MT', 'NV', 'NH', 'PA', 'WA'
];

// Area codes to state mapping (comprehensive list)
export const AREA_CODE_TO_STATE: Record<string, string> = {
  // Alabama
  '205': 'AL', '251': 'AL', '256': 'AL', '334': 'AL', '938': 'AL',
  // Alaska
  '907': 'AK',
  // Arizona
  '480': 'AZ', '520': 'AZ', '602': 'AZ', '623': 'AZ', '928': 'AZ',
  // Arkansas
  '479': 'AR', '501': 'AR', '870': 'AR',
  // California (Two-party consent)
  '209': 'CA', '213': 'CA', '310': 'CA', '323': 'CA', '408': 'CA', '415': 'CA',
  '424': 'CA', '442': 'CA', '510': 'CA', '530': 'CA', '559': 'CA', '562': 'CA',
  '619': 'CA', '626': 'CA', '628': 'CA', '650': 'CA', '657': 'CA', '661': 'CA',
  '669': 'CA', '707': 'CA', '714': 'CA', '747': 'CA', '760': 'CA', '805': 'CA',
  '818': 'CA', '831': 'CA', '858': 'CA', '909': 'CA', '916': 'CA', '925': 'CA',
  '949': 'CA', '951': 'CA',
  // Colorado
  '303': 'CO', '719': 'CO', '720': 'CO', '970': 'CO',
  // Connecticut (Two-party consent)
  '203': 'CT', '475': 'CT', '860': 'CT', '959': 'CT',
  // Delaware
  '302': 'DE',
  // Florida (Two-party consent)
  '239': 'FL', '305': 'FL', '321': 'FL', '352': 'FL', '386': 'FL', '407': 'FL',
  '561': 'FL', '727': 'FL', '754': 'FL', '772': 'FL', '786': 'FL', '813': 'FL',
  '850': 'FL', '863': 'FL', '904': 'FL', '941': 'FL', '954': 'FL',
  // Georgia
  '229': 'GA', '404': 'GA', '470': 'GA', '478': 'GA', '678': 'GA', '706': 'GA',
  '762': 'GA', '770': 'GA', '912': 'GA',
  // Hawaii
  '808': 'HI',
  // Idaho
  '208': 'ID', '986': 'ID',
  // Illinois (Two-party consent)
  '217': 'IL', '224': 'IL', '309': 'IL', '312': 'IL', '331': 'IL', '618': 'IL',
  '630': 'IL', '708': 'IL', '773': 'IL', '779': 'IL', '815': 'IL', '847': 'IL',
  '872': 'IL',
  // Indiana
  '219': 'IN', '260': 'IN', '317': 'IN', '463': 'IN', '574': 'IN', '765': 'IN',
  '812': 'IN', '930': 'IN',
  // Iowa
  '319': 'IA', '515': 'IA', '563': 'IA', '641': 'IA', '712': 'IA',
  // Kansas
  '316': 'KS', '620': 'KS', '785': 'KS', '913': 'KS',
  // Kentucky
  '270': 'KY', '364': 'KY', '502': 'KY', '606': 'KY', '859': 'KY',
  // Louisiana
  '225': 'LA', '318': 'LA', '337': 'LA', '504': 'LA', '985': 'LA',
  // Maine
  '207': 'ME',
  // Maryland (Two-party consent)
  '240': 'MD', '301': 'MD', '410': 'MD', '443': 'MD', '667': 'MD',
  // Massachusetts (Two-party consent)
  '339': 'MA', '351': 'MA', '413': 'MA', '508': 'MA', '617': 'MA', '774': 'MA',
  '781': 'MA', '857': 'MA', '978': 'MA',
  // Michigan (Two-party consent)
  '231': 'MI', '248': 'MI', '269': 'MI', '313': 'MI', '517': 'MI', '586': 'MI',
  '616': 'MI', '734': 'MI', '810': 'MI', '906': 'MI', '947': 'MI', '989': 'MI',
  // Minnesota
  '218': 'MN', '320': 'MN', '507': 'MN', '612': 'MN', '651': 'MN', '763': 'MN',
  '952': 'MN',
  // Mississippi
  '228': 'MS', '601': 'MS', '662': 'MS', '769': 'MS',
  // Missouri
  '314': 'MO', '417': 'MO', '573': 'MO', '636': 'MO', '660': 'MO', '816': 'MO',
  // Montana (Two-party consent)
  '406': 'MT',
  // Nebraska
  '308': 'NE', '402': 'NE', '531': 'NE',
  // Nevada (Two-party consent)
  '702': 'NV', '725': 'NV', '775': 'NV',
  // New Hampshire (Two-party consent)
  '603': 'NH',
  // New Jersey
  '201': 'NJ', '551': 'NJ', '609': 'NJ', '732': 'NJ', '848': 'NJ', '856': 'NJ',
  '862': 'NJ', '908': 'NJ', '973': 'NJ',
  // New Mexico
  '505': 'NM', '575': 'NM',
  // New York
  '212': 'NY', '315': 'NY', '332': 'NY', '347': 'NY', '516': 'NY', '518': 'NY',
  '585': 'NY', '607': 'NY', '631': 'NY', '646': 'NY', '680': 'NY', '716': 'NY',
  '718': 'NY', '838': 'NY', '845': 'NY', '914': 'NY', '917': 'NY', '929': 'NY',
  '934': 'NY',
  // North Carolina
  '252': 'NC', '336': 'NC', '704': 'NC', '743': 'NC', '828': 'NC', '910': 'NC',
  '919': 'NC', '980': 'NC', '984': 'NC',
  // North Dakota
  '701': 'ND',
  // Ohio
  '216': 'OH', '220': 'OH', '234': 'OH', '330': 'OH', '380': 'OH', '419': 'OH',
  '440': 'OH', '513': 'OH', '567': 'OH', '614': 'OH', '740': 'OH', '937': 'OH',
  // Oklahoma
  '405': 'OK', '539': 'OK', '580': 'OK', '918': 'OK',
  // Oregon
  '458': 'OR', '503': 'OR', '541': 'OR', '971': 'OR',
  // Pennsylvania (Two-party consent)
  '215': 'PA', '223': 'PA', '267': 'PA', '272': 'PA', '412': 'PA', '445': 'PA',
  '484': 'PA', '570': 'PA', '610': 'PA', '717': 'PA', '724': 'PA', '814': 'PA',
  '835': 'PA', '878': 'PA',
  // Rhode Island
  '401': 'RI',
  // South Carolina
  '803': 'SC', '843': 'SC', '854': 'SC', '864': 'SC',
  // South Dakota
  '605': 'SD',
  // Tennessee
  '423': 'TN', '615': 'TN', '629': 'TN', '731': 'TN', '865': 'TN', '901': 'TN',
  '931': 'TN',
  // Texas
  '210': 'TX', '214': 'TX', '254': 'TX', '281': 'TX', '325': 'TX', '346': 'TX',
  '361': 'TX', '409': 'TX', '430': 'TX', '432': 'TX', '469': 'TX', '512': 'TX',
  '682': 'TX', '713': 'TX', '726': 'TX', '737': 'TX', '806': 'TX', '817': 'TX',
  '830': 'TX', '832': 'TX', '903': 'TX', '915': 'TX', '936': 'TX', '940': 'TX',
  '956': 'TX', '972': 'TX', '979': 'TX',
  // Utah
  '385': 'UT', '435': 'UT', '801': 'UT',
  // Vermont
  '802': 'VT',
  // Virginia
  '276': 'VA', '434': 'VA', '540': 'VA', '571': 'VA', '703': 'VA', '757': 'VA',
  '804': 'VA',
  // Washington (Two-party consent)
  '206': 'WA', '253': 'WA', '360': 'WA', '425': 'WA', '509': 'WA', '564': 'WA',
  // West Virginia
  '304': 'WV', '681': 'WV',
  // Wisconsin
  '262': 'WI', '414': 'WI', '534': 'WI', '608': 'WI', '715': 'WI', '920': 'WI',
  // Wyoming
  '307': 'WY',
  // Washington DC
  '202': 'DC',
};

// State to timezone mapping
export const STATE_TO_TIMEZONE: Record<string, string> = {
  // Eastern Time
  'CT': 'America/New_York', 'DE': 'America/New_York', 'FL': 'America/New_York',
  'GA': 'America/New_York', 'IN': 'America/Indiana/Indianapolis', 'KY': 'America/New_York',
  'ME': 'America/New_York', 'MD': 'America/New_York', 'MA': 'America/New_York',
  'MI': 'America/Detroit', 'NH': 'America/New_York', 'NJ': 'America/New_York',
  'NY': 'America/New_York', 'NC': 'America/New_York', 'OH': 'America/New_York',
  'PA': 'America/New_York', 'RI': 'America/New_York', 'SC': 'America/New_York',
  'VT': 'America/New_York', 'VA': 'America/New_York', 'WV': 'America/New_York',
  'DC': 'America/New_York',
  // Central Time
  'AL': 'America/Chicago', 'AR': 'America/Chicago', 'IL': 'America/Chicago',
  'IA': 'America/Chicago', 'KS': 'America/Chicago', 'LA': 'America/Chicago',
  'MN': 'America/Chicago', 'MS': 'America/Chicago', 'MO': 'America/Chicago',
  'NE': 'America/Chicago', 'ND': 'America/Chicago', 'OK': 'America/Chicago',
  'SD': 'America/Chicago', 'TN': 'America/Chicago', 'TX': 'America/Chicago',
  'WI': 'America/Chicago',
  // Mountain Time
  'AZ': 'America/Phoenix', 'CO': 'America/Denver', 'ID': 'America/Denver',
  'MT': 'America/Denver', 'NM': 'America/Denver', 'UT': 'America/Denver',
  'WY': 'America/Denver', 'NV': 'America/Los_Angeles',
  // Pacific Time
  'CA': 'America/Los_Angeles', 'OR': 'America/Los_Angeles', 'WA': 'America/Los_Angeles',
  // Alaska & Hawaii
  'AK': 'America/Anchorage', 'HI': 'Pacific/Honolulu',
};

// State full names
export const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'Washington DC',
};

/**
 * Get state from phone number area code
 */
export function getStateFromPhone(phoneNumber: string): string | null {
  const digits = phoneNumber.replace(/\D/g, '');
  let areaCode: string;
  
  if (digits.length === 11 && digits.startsWith('1')) {
    areaCode = digits.substring(1, 4);
  } else if (digits.length === 10) {
    areaCode = digits.substring(0, 3);
  } else {
    return null;
  }
  
  return AREA_CODE_TO_STATE[areaCode] || null;
}

/**
 * Get timezone from state
 */
export function getTimezoneFromState(state: string): string {
  return STATE_TO_TIMEZONE[state] || 'America/New_York';
}

/**
 * Check if state requires two-party consent for recording
 */
export function isTwoPartyConsentState(state: string): boolean {
  return TWO_PARTY_CONSENT_STATES.includes(state);
}

/**
 * Check if current time is within business hours (8 AM - 9 PM) in recipient's timezone
 */
export function isWithinBusinessHours(timezone: string): { 
  isValid: boolean; 
  localTime: string; 
  localHour: number;
  message?: string;
} {
  try {
    const now = new Date();
    const localTimeStr = now.toLocaleString('en-US', { 
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const [hourStr] = localTimeStr.split(':');
    const localHour = parseInt(hourStr, 10);
    
    const isValid = localHour >= 8 && localHour < 21; // 8 AM to 9 PM
    
    return {
      isValid,
      localTime: now.toLocaleString('en-US', { 
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      localHour,
      message: !isValid 
        ? `It's currently ${now.toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true })} in the recipient's timezone. Calls are only allowed between 8 AM and 9 PM.`
        : undefined
    };
  } catch {
    return { isValid: true, localTime: 'Unknown', localHour: 12 };
  }
}

/**
 * Validate call compliance before initiating
 */
export interface ComplianceCheckResult {
  canCall: boolean;
  state: string | null;
  stateName: string | null;
  timezone: string;
  isTwoPartyConsent: boolean;
  isWithinBusinessHours: boolean;
  localTime: string;
  warnings: string[];
  blockers: string[];
}

export function checkCallCompliance(phoneNumber: string): ComplianceCheckResult {
  const state = getStateFromPhone(phoneNumber);
  const stateName = state ? STATE_NAMES[state] || state : null;
  const timezone = state ? getTimezoneFromState(state) : 'America/New_York';
  const isTwoParty = state ? isTwoPartyConsentState(state) : false;
  const businessHoursCheck = isWithinBusinessHours(timezone);
  
  const warnings: string[] = [];
  const blockers: string[] = [];
  
  if (!state) {
    warnings.push('Could not determine recipient state from phone number');
  }
  
  if (isTwoParty) {
    warnings.push(`${stateName || state} is a two-party consent state - explicit recording consent required`);
  }
  
  if (!businessHoursCheck.isValid) {
    blockers.push(businessHoursCheck.message || 'Outside business hours');
  }
  
  return {
    canCall: blockers.length === 0,
    state,
    stateName,
    timezone,
    isTwoPartyConsent: isTwoParty,
    isWithinBusinessHours: businessHoursCheck.isValid,
    localTime: businessHoursCheck.localTime,
    warnings,
    blockers,
  };
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}
