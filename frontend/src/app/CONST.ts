export const DOMAIN = 'https://spletka.com';

export const STUDIO_TYPES : Record<string, string> = {
    '0': 'STUDIO_TYPE.HAIR_STYLIST',
    '1': 'STUDIO_TYPE.NAIL_TECHNICIAN',
    '2': 'STUDIO_TYPE.MASSAGE_THERAPIST',
    '3': 'STUDIO_TYPE.BARBER',
    '4': 'STUDIO_TYPE.MAKEUP_ARTIST',
    '5': 'STUDIO_TYPE.ESTHETICIAN',
    '6': 'STUDIO_TYPE.WAX_SPECIALIST',
    '7': 'STUDIO_TYPE.TATTOO_ARTIST',
    '8': 'STUDIO_TYPE.MICROBLADING_ARTIST',
    '9': 'STUDIO_TYPE.SPRAY_TAN_SPECIALIST',
    '10': 'STUDIO_TYPE.HENNA_ARTIST',
}
export const SERVICE_TYPES: Record<string, string> = {
    // ─── HAIR SERVICES ───────────────────────────────────────────
    '100': 'SERVICE_TYPE.HAIRCUT',
    '101': 'SERVICE_TYPE.BLOWOUT',
    '102': 'SERVICE_TYPE.HAIR_COLORING',
    '103': 'SERVICE_TYPE.HIGHLIGHTS_AND_BALAYAGE',
    '104': 'SERVICE_TYPE.HAIR_EXTENSIONS',
    '105': 'SERVICE_TYPE.BRAIDS_AND_PROTECTIVE_STYLES',
    '106': 'SERVICE_TYPE.NATURAL_HAIR_TREATMENT',
    '107': 'SERVICE_TYPE.KERATIN_AND_SMOOTHING',
    '108': 'SERVICE_TYPE.LOCS_AND_DREADLOCKS',
    '109': 'SERVICE_TYPE.SCALP_TREATMENT',

    // ─── NAIL SERVICES ───────────────────────────────────────────
    '200': 'SERVICE_TYPE.MANICURE',
    '201': 'SERVICE_TYPE.PEDICURE',
    '202': 'SERVICE_TYPE.GEL_NAILS',
    '203': 'SERVICE_TYPE.ACRYLIC_NAILS',
    '204': 'SERVICE_TYPE.NAIL_ART',
    '205': 'SERVICE_TYPE.NAIL_EXTENSIONS',
    '206': 'SERVICE_TYPE.PRESS_ON_NAILS',
    '207': 'SERVICE_TYPE.NAIL_REPAIR',

    // ─── MASSAGE THERAPY ─────────────────────────────────────────
    '300': 'SERVICE_TYPE.SWEDISH_MASSAGE',
    '301': 'SERVICE_TYPE.DEEP_TISSUE_MASSAGE',
    '302': 'SERVICE_TYPE.HOT_STONE_MASSAGE',
    '303': 'SERVICE_TYPE.PRENATAL_MASSAGE',
    '304': 'SERVICE_TYPE.SPORTS_MASSAGE',
    '305': 'SERVICE_TYPE.LYMPHATIC_DRAINAGE',
    '306': 'SERVICE_TYPE.HEAD_AND_SCALP_MASSAGE',
    '307': 'SERVICE_TYPE.REFLEXOLOGY',

    // ─── BARBERING ───────────────────────────────────────────────
    '400': 'SERVICE_TYPE.MENS_HAIRCUT',
    '401': 'SERVICE_TYPE.FADE_AND_TAPER',
    '402': 'SERVICE_TYPE.BEARD_TRIM',
    '403': 'SERVICE_TYPE.HOT_TOWEL_SHAVE',
    '404': 'SERVICE_TYPE.KIDS_HAIRCUT',
    '405': 'SERVICE_TYPE.HAIR_DESIGN_AND_LINEUP',

    // ─── MAKEUP SERVICES ─────────────────────────────────────────
    '500': 'SERVICE_TYPE.EVERYDAY_MAKEUP',
    '501': 'SERVICE_TYPE.BRIDAL_MAKEUP',
    '502': 'SERVICE_TYPE.EVENT_AND_OCCASION_MAKEUP',
    '503': 'SERVICE_TYPE.AIRBRUSH_MAKEUP',
    '504': 'SERVICE_TYPE.EDITORIAL_MAKEUP',
    '505': 'SERVICE_TYPE.MAKEUP_LESSON',

    // ─── SKIN CARE ───────────────────────────────────────────────
    '600': 'SERVICE_TYPE.CLASSIC_FACIAL',
    '601': 'SERVICE_TYPE.DEEP_CLEANSING_FACIAL',
    '602': 'SERVICE_TYPE.ANTI_AGING_FACIAL',
    '603': 'SERVICE_TYPE.ACNE_TREATMENT',
    '604': 'SERVICE_TYPE.CHEMICAL_PEEL',
    '605': 'SERVICE_TYPE.DERMAPLANING',
    '606': 'SERVICE_TYPE.MICRODERMABRASION',
    '607': 'SERVICE_TYPE.LED_LIGHT_THERAPY',
    '608': 'SERVICE_TYPE.HYDRAFACIAL',

    // ─── HAIR REMOVAL ────────────────────────────────────────────
    '700': 'SERVICE_TYPE.BODY_WAXING',
    '701': 'SERVICE_TYPE.FACIAL_WAXING',
    '702': 'SERVICE_TYPE.BIKINI_AND_BRAZILIAN_WAX',
    '703': 'SERVICE_TYPE.THREADING',
    '704': 'SERVICE_TYPE.SUGARING',
    '705': 'SERVICE_TYPE.LASER_HAIR_REMOVAL',

    // ─── TATTOO SERVICES ─────────────────────────────────────────
    '800': 'SERVICE_TYPE.CUSTOM_TATTOO',
    '801': 'SERVICE_TYPE.FLASH_TATTOO',
    '802': 'SERVICE_TYPE.TATTOO_COVERUP',
    '803': 'SERVICE_TYPE.FINE_LINE_TATTOO',
    '804': 'SERVICE_TYPE.BLACKWORK_TATTOO',
    '805': 'SERVICE_TYPE.WATERCOLOR_TATTOO',
    '806': 'SERVICE_TYPE.TATTOO_TOUCH_UP',

    // ─── BROWS AND LASHES ────────────────────────────────────────
    '900': 'SERVICE_TYPE.MICROBLADING',
    '901': 'SERVICE_TYPE.POWDER_BROWS',
    '902': 'SERVICE_TYPE.BROW_LAMINATION',
    '903': 'SERVICE_TYPE.BROW_TINTING',
    '904': 'SERVICE_TYPE.BROW_SHAPING',
    '905': 'SERVICE_TYPE.LASH_EXTENSIONS',
    '906': 'SERVICE_TYPE.LASH_LIFT_AND_TINT',
    '907': 'SERVICE_TYPE.NANO_BROWS',

    // ─── TANNING SERVICES ────────────────────────────────────────
    '1000': 'SERVICE_TYPE.FULL_BODY_SPRAY_TAN',
    '1001': 'SERVICE_TYPE.AIRBRUSH_TAN',
    '1002': 'SERVICE_TYPE.EXPRESS_TAN',
    '1003': 'SERVICE_TYPE.BRIDAL_TAN',

    // ─── HENNA AND BODY ART ──────────────────────────────────────
    '1100': 'SERVICE_TYPE.TRADITIONAL_HENNA',
    '1101': 'SERVICE_TYPE.BRIDAL_HENNA',
    '1102': 'SERVICE_TYPE.JAGUA_TATTOO',
    '1103': 'SERVICE_TYPE.GLITTER_TATTOO',
    '1104': 'SERVICE_TYPE.BODY_PAINTING',
};
export const SERVICE_TYPES_REVERSE: Record<string, string> = {
    // ─── HAIR SERVICES ───────────────────────────────────────────
    'SERVICE_TYPE.HAIRCUT': '100',
    'SERVICE_TYPE.BLOWOUT': '101',
    'SERVICE_TYPE.HAIR_COLORING': '102',
    'SERVICE_TYPE.HIGHLIGHTS_AND_BALAYAGE': '103',
    'SERVICE_TYPE.HAIR_EXTENSIONS': '104',
    'SERVICE_TYPE.BRAIDS_AND_PROTECTIVE_STYLES': '105',
    'SERVICE_TYPE.NATURAL_HAIR_TREATMENT': '106',
    'SERVICE_TYPE.KERATIN_AND_SMOOTHING': '107',
    'SERVICE_TYPE.LOCS_AND_DREADLOCKS': '108',
    'SERVICE_TYPE.SCALP_TREATMENT': '109',

    // ─── NAIL SERVICES ───────────────────────────────────────────
    'SERVICE_TYPE.MANICURE': '200',
    'SERVICE_TYPE.PEDICURE': '201',
    'SERVICE_TYPE.GEL_NAILS': '202',
    'SERVICE_TYPE.ACRYLIC_NAILS': '203',
    'SERVICE_TYPE.NAIL_ART': '204',
    'SERVICE_TYPE.NAIL_EXTENSIONS': '205',
    'SERVICE_TYPE.PRESS_ON_NAILS': '206',
    'SERVICE_TYPE.NAIL_REPAIR': '207',

    // ─── MASSAGE THERAPY ─────────────────────────────────────────
    'SERVICE_TYPE.SWEDISH_MASSAGE': '300',
    'SERVICE_TYPE.DEEP_TISSUE_MASSAGE': '301',
    'SERVICE_TYPE.HOT_STONE_MASSAGE': '302',
    'SERVICE_TYPE.PRENATAL_MASSAGE': '303',
    'SERVICE_TYPE.SPORTS_MASSAGE': '304',
    'SERVICE_TYPE.LYMPHATIC_DRAINAGE': '305',
    'SERVICE_TYPE.HEAD_AND_SCALP_MASSAGE': '306',
    'SERVICE_TYPE.REFLEXOLOGY': '307',

    // ─── BARBERING ───────────────────────────────────────────────
    'SERVICE_TYPE.MENS_HAIRCUT': '400',
    'SERVICE_TYPE.FADE_AND_TAPER': '401',
    'SERVICE_TYPE.BEARD_TRIM': '402',
    'SERVICE_TYPE.HOT_TOWEL_SHAVE': '403',
    'SERVICE_TYPE.KIDS_HAIRCUT': '404',
    'SERVICE_TYPE.HAIR_DESIGN_AND_LINEUP': '405',

    // ─── MAKEUP SERVICES ─────────────────────────────────────────
    'SERVICE_TYPE.EVERYDAY_MAKEUP': '500',
    'SERVICE_TYPE.BRIDAL_MAKEUP': '501',
    'SERVICE_TYPE.EVENT_AND_OCCASION_MAKEUP': '502',
    'SERVICE_TYPE.AIRBRUSH_MAKEUP': '503',
    'SERVICE_TYPE.EDITORIAL_MAKEUP': '504',
    'SERVICE_TYPE.MAKEUP_LESSON': '505',

    // ─── SKIN CARE ───────────────────────────────────────────────
    'SERVICE_TYPE.CLASSIC_FACIAL': '600',
    'SERVICE_TYPE.DEEP_CLEANSING_FACIAL': '601',
    'SERVICE_TYPE.ANTI_AGING_FACIAL': '602',
    'SERVICE_TYPE.ACNE_TREATMENT': '603',
    'SERVICE_TYPE.CHEMICAL_PEEL': '604',
    'SERVICE_TYPE.DERMAPLANING': '605',
    'SERVICE_TYPE.MICRODERMABRASION': '606',
    'SERVICE_TYPE.LED_LIGHT_THERAPY': '607',
    'SERVICE_TYPE.HYDRAFACIAL': '608',

    // ─── HAIR REMOVAL ────────────────────────────────────────────
    'SERVICE_TYPE.BODY_WAXING': '700',
    'SERVICE_TYPE.FACIAL_WAXING': '701',
    'SERVICE_TYPE.BIKINI_AND_BRAZILIAN_WAX': '702',
    'SERVICE_TYPE.THREADING': '703',
    'SERVICE_TYPE.SUGARING': '704',
    'SERVICE_TYPE.LASER_HAIR_REMOVAL': '705',

    // ─── TATTOO SERVICES ─────────────────────────────────────────
    'SERVICE_TYPE.CUSTOM_TATTOO': '800',
    'SERVICE_TYPE.FLASH_TATTOO': '801',
    'SERVICE_TYPE.TATTOO_COVERUP': '802',
    'SERVICE_TYPE.FINE_LINE_TATTOO': '803',
    'SERVICE_TYPE.BLACKWORK_TATTOO': '804',
    'SERVICE_TYPE.WATERCOLOR_TATTOO': '805',
    'SERVICE_TYPE.TATTOO_TOUCH_UP': '806',

    // ─── BROWS AND LASHES ────────────────────────────────────────
    'SERVICE_TYPE.MICROBLADING': '900',
    'SERVICE_TYPE.POWDER_BROWS': '901',
    'SERVICE_TYPE.BROW_LAMINATION': '902',
    'SERVICE_TYPE.BROW_TINTING': '903',
    'SERVICE_TYPE.BROW_SHAPING': '904',
    'SERVICE_TYPE.LASH_EXTENSIONS': '905',
    'SERVICE_TYPE.LASH_LIFT_AND_TINT': '906',
    'SERVICE_TYPE.NANO_BROWS': '907',

    // ─── TANNING SERVICES ────────────────────────────────────────
    'SERVICE_TYPE.FULL_BODY_SPRAY_TAN': '1000',
    'SERVICE_TYPE.AIRBRUSH_TAN': '1001',
    'SERVICE_TYPE.EXPRESS_TAN': '1002',
    'SERVICE_TYPE.BRIDAL_TAN': '1003',

    // ─── HENNA AND BODY ART ──────────────────────────────────────
    'SERVICE_TYPE.TRADITIONAL_HENNA': '1100',
    'SERVICE_TYPE.BRIDAL_HENNA': '1101',
    'SERVICE_TYPE.JAGUA_TATTOO': '1102',
    'SERVICE_TYPE.GLITTER_TATTOO': '1103',
    'SERVICE_TYPE.BODY_PAINTING': '1104',
};

export const RESERVATION_STATUSES: Record<string, string> = {
    'PENDING_CONFIRMATION': 'RESERVATION_STATUS.PENDING_CONFIRMATION',
    'CONFIRMATION_EXPIRED': 'RESERVATION_STATUS.CONFIRMATION_EXPIRED',
    'CONFIRMED': 'RESERVATION_STATUS.CONFIRMED',
    'USER_CANCELLED': 'RESERVATION_STATUS.USER_CANCELLED',
    'USER_LATE_CANCELLED': 'RESERVATION_STATUS.USER_LATE_CANCELLED',
    'OWNER_CANCELLED': 'RESERVATION_STATUS.OWNER_CANCELLED',
    'OWNER_LATE_CANCELLED': 'RESERVATION_STATUS.OWNER_LATE_CANCELLED',
    'COMPLETED': 'RESERVATION_STATUS.COMPLETED',
    'MISSED': 'RESERVATION_STATUS.MISSED',
}

export const CURRENCIES: string[] = [
    'EUR',  // Euro - 20 EU countries
    'DKK',  // Danish Krone
    'NOK',  // Norwegian Krone
    'SEK',  // Swedish Krona
    'ISK',  // Icelandic Króna
    'GBP',  // Pound Sterling
    'GIP',  // Gibraltar Pound
    'CHF',  // Swiss Franc
    'CZK',  // Czech Koruna
    'PLN',  // Polish Złoty
    'HUF',  // Hungarian Forint
    'RON',  // Romanian Leu
    'BGN',  // Bulgarian Lev
    'ALL',  // Albanian Lek
    'BAM',  // Bosnia and Herzegovina Convertible Mark
    'MKD',  // Macedonian Denar
    'RSD',  // Serbian Dinar
    'UAH',  // Ukrainian Hryvnia
    'BYN',  // Belarusian Ruble
    'RUB',  // Russian Ruble
    'MDL',  // Moldovan Leu
    'GEL',  // Georgian Lari
    'AMD',  // Armenian Dram
    'AZN',  // Azerbaijani Manat
    'TRY',  // Turkish Lira,
    'USD',  // United States Dollar
];
export const setup_errors: Record<string, Record<string, string>> = {
    'profile': {
        'invalidProfile' : 'ERRORS.SETUP.PROFILE.INVALID_PROFILE',
        'missingStudioName' : 'ERRORS.SETUP.PROFILE.MISSING_STUDIO_NAME',
        'tooShortStudioName' : 'ERRORS.SETUP.PROFILE.TOO_SHORT_STUDIO_NAME',
        'missingStudioLink' : 'ERRORS.SETUP.PROFILE.MISSING_STUDIO_LINK',
        'tooShortStudioLink' : 'ERRORS.SETUP.PROFILE.TOO_SHORT_STUDIO_LINK',
        'missingStudioTypes' : 'ERRORS.SETUP.PROFILE.MISSING_STUDIO_TYPES',
        'missingContactEmail' : 'ERRORS.SETUP.PROFILE.MISSING_CONTACT_EMAIL',
        'invalidContactEmail' : 'ERRORS.SETUP.PROFILE.INVALID_CONTACT_EMAIL',
        'missingContactPhone' : 'ERRORS.SETUP.PROFILE.MISSING_CONTACT_PHONE',
        'invalidContactPhone' : 'ERRORS.SETUP.PROFILE.INVALID_CONTACT_PHONE',
        'invalidInstagram' : 'ERRORS.SETUP.PROFILE.INVALID_INSTAGRAM',
        'invalidFacebook' : 'ERRORS.SETUP.PROFILE.INVALID_FACEBOOK',
        'invalidWhatsappPhone' : 'ERRORS.SETUP.PROFILE.INVALID_WA_PHONE',
    },
    'location': {
        "invalidLocation": "ERRORS.SETUP.LOCATION.INVALID_LOCATION",
        "missingCountry": "ERRORS.SETUP.LOCATION.MISSING_COUNTRY",
        "missingCity": "ERRORS.SETUP.LOCATION.MISSING_CITY",
        "missingStreet": "ERRORS.SETUP.LOCATION.MISSING_STREET",
        "missingBuildingNumber": "ERRORS.SETUP.LOCATION.MISSING_BUILDING_NUMBER",
        "missingApartmentNumber": "ERRORS.SETUP.LOCATION.MISSING_APARTMENT_NUMBER",
        "invalidLatitude": "ERRORS.SETUP.LOCATION.INVALID_LATITUDE",
        "invalidLongitude": "ERRORS.SETUP.LOCATION.INVALID_LONGITUDE",
        "missingLatitude": "ERRORS.SETUP.LOCATION.MISSING_LATITUDE",
        "missingLongitude": "ERRORS.SETUP.LOCATION.MISSING_LONGITUDE",
    },
    'media': {
        "invalidMedia": "ERRORS.SETUP.MEDIA.INVALID_MEDIA",
        "missingThumbnail": "ERRORS.SETUP.MEDIA.MISSING_THUMBNAIL",
        "invalidHeroImagesCount": "ERRORS.SETUP.MEDIA.INVALID_HERO_IMAGES_COUNT",
        "invalidHeroImage": "ERRORS.SETUP.MEDIA.INVALID_HERO_IMAGE",
    },
    'schedule': {
        // Array-level (scheduleArrayValidator)
        "invalidSchedulesArray":        "ERRORS.SETUP.SCHEDULE.INVALID_SCHEDULES_ARRAY",
        "missingSchedules":             "ERRORS.SETUP.SCHEDULE.MISSING_SCHEDULES",
        "emptySchedules":               "ERRORS.SETUP.SCHEDULE.EMPTY_SCHEDULES",
        // Schedule-level date fields (scheduleArrayValidator, si > 0)
        "missingEffectiveFrom":         "ERRORS.SETUP.SCHEDULE.MISSING_EFFECTIVE_FROM",
        "effectiveFromInvalidFormat":   "ERRORS.SETUP.SCHEDULE.EFFECTIVE_FROM_INVALID_FORMAT",
        "missingEffectiveTo":           "ERRORS.SETUP.SCHEDULE.MISSING_EFFECTIVE_TO",
        "effectiveToInvalidFormat":     "ERRORS.SETUP.SCHEDULE.EFFECTIVE_TO_INVALID_FORMAT",
        "effectiveRangeInvalid":        "ERRORS.SETUP.SCHEDULE.EFFECTIVE_RANGE_INVALID",
        // Schedule-level days (scheduleValidator)
        "invalidSchedule":              "ERRORS.SETUP.SCHEDULE.INVALID_SCHEDULE",
        "invalidDaysAmount":            "ERRORS.SETUP.SCHEDULE.INVALID_DAYS_AMOUNT",
        // Day-level (scheduleValidator → days[i])
        "invalidDay":                   "ERRORS.SETUP.SCHEDULE.INVALID_DAY",
        "missingDayName":               "ERRORS.SETUP.SCHEDULE.MISSING_DAY_NAME",
        "invalidIntervals":             "ERRORS.SETUP.SCHEDULE.INVALID_INTERVALS",
        "missingIntervals":             "ERRORS.SETUP.SCHEDULE.MISSING_INTERVALS",
        "overlappingIntervals":         "ERRORS.SETUP.SCHEDULE.OVERLAPPING_INTERVALS",
        // Interval-level (scheduleValidator → days[i].intervals[j])
        "invalidInterval":              "ERRORS.SETUP.SCHEDULE.INVALID_INTERVAL",
        "invalidIntervalStart":         "ERRORS.SETUP.SCHEDULE.INVALID_INTERVAL_START",
        "invalidIntervalEnd":           "ERRORS.SETUP.SCHEDULE.INVALID_INTERVAL_END",
        "invalidIntervalRange":         "ERRORS.SETUP.SCHEDULE.INVALID_INTERVAL_RANGE",
    },
    'exceptions': {
        "invalidExceptions": "ERRORS.SETUP.EXCEPTIONS.INVALID_EXCEPTIONS",
        "invalidExceptionsArray": "ERRORS.SETUP.EXCEPTIONS.INVALID_EXCEPTIONS_ARRAY",
        "invalidException": "ERRORS.SETUP.EXCEPTIONS.INVALID_EXCEPTION",
        "invalidExceptionType": "ERRORS.SETUP.EXCEPTIONS.INVALID_EXCEPTION_TYPE",
        "invalidIntervals": "ERRORS.SETUP.EXCEPTIONS.INVALID_INTERVALS",
        "missingIntervals": "ERRORS.SETUP.EXCEPTIONS.MISSING_INTERVALS",
        "invalidAppliesTo": "ERRORS.SETUP.EXCEPTIONS.INVALID_APPLIES_TO",
        "overlappingIntervals": "ERRORS.SETUP.EXCEPTIONS.OVERLAPPING_INTERVALS",
        "invalidInterval": "ERRORS.SETUP.EXCEPTIONS.INVALID_INTERVAL",
        "invalidIntervalStart": "ERRORS.SETUP.EXCEPTIONS.INVALID_INTERVAL_START",
        "invalidIntervalEnd": "ERRORS.SETUP.EXCEPTIONS.INVALID_INTERVAL_END",
        "invalidIntervalRange": "ERRORS.SETUP.EXCEPTIONS.INVALID_INTERVAL_RANGE",
    },
    'categories': {
        "emptyName": "ERRORS.SETUP.CATEGORIES.EMPTY_NAME",
        "duplicateName": "ERRORS.SETUP.CATEGORIES.DUPLICATE_NAME",
    },
    'services': {
        "required": "ERRORS.SETUP.SERVICES.REQUIRED",
        "invalidService": "ERRORS.SETUP.SERVICES.INVALID_SERVICE",
        "missingLocalID": "ERRORS.SETUP.SERVICES.MISSING_LOCAL_ID",
        "missingName": "ERRORS.SETUP.SERVICES.MISSING_NAME",
        "missingLink": "ERRORS.SETUP.SERVICES.MISSING_LINK",
        "missingCategory": "ERRORS.SETUP.SERVICES.MISSING_CATEGORY",
        "missingCurrency": "ERRORS.SETUP.SERVICES.MISSING_CURRENCY",
        "invalidPrice": "ERRORS.SETUP.SERVICES.INVALID_PRICE",
        "invalidDuration": "ERRORS.SETUP.SERVICES.INVALID_DURATION",
        "invalidServiceTypes": "ERRORS.SETUP.SERVICES.INVALID_SERVICE_TYPES",
        "invalidThumbnail": "ERRORS.SETUP.SERVICES.INVALID_THUMBNAIL",
        "invalidGallery": "ERRORS.SETUP.SERVICES.INVALID_GALLERY",
        "duplicateLink": "ERRORS.SETUP.SERVICES.DUPLICATE_LINK",
        "missingPrice": "ERRORS.SETUP.SERVICES.MISSING_PRICE",
        "missingDuration": "ERRORS.SETUP.SERVICES.MISSING_DURATION",
    },
    'packages': {
        "invalidPackage": "ERRORS.SETUP.PACKAGES.INVALID_PACKAGE",
        "missingLocalID": "ERRORS.SETUP.PACKAGES.MISSING_LOCAL_ID",
        "missingName": "ERRORS.SETUP.PACKAGES.MISSING_NAME",
        "missingLink": "ERRORS.SETUP.PACKAGES.MISSING_LINK",
        "missingCurrency": "ERRORS.SETUP.PACKAGES.MISSING_CURRENCY",
        "invalidPrice": "ERRORS.SETUP.PACKAGES.INVALID_PRICE",
        "invalidDuration": "ERRORS.SETUP.PACKAGES.INVALID_DURATION",
        "missingServices": "ERRORS.SETUP.PACKAGES.MISSING_SERVICES",
        "invalidServices": "ERRORS.SETUP.PACKAGES.INVALID_SERVICES",
        "duplicateServices": "ERRORS.SETUP.PACKAGES.DUPLICATE_SERVICES",
        "duplicateLink": "ERRORS.SETUP.PACKAGES.DUPLICATE_LINK",
        "missingPrice": "ERRORS.SETUP.PACKAGES.MISSING_PRICE",
        "missingDuration": "ERRORS.SETUP.PACKAGES.MISSING_DURATION",
    },
    'discounts': {
        "invalidDiscount": "ERRORS.SETUP.DISCOUNTS.INVALID_DISCOUNT",
        "missingLocalID": "ERRORS.SETUP.DISCOUNTS.MISSING_LOCAL_ID",
        "missingArticle": "ERRORS.SETUP.DISCOUNTS.MISSING_ARTICLE",
        "invalidPercentage": "ERRORS.SETUP.DISCOUNTS.INVALID_PERCENTAGE",
        "missingArticleLocalID": "ERRORS.SETUP.DISCOUNTS.MISSING_ARTICLE_LOCAL_ID",
        "invalidArticleType": "ERRORS.SETUP.DISCOUNTS.INVALID_ARTICLE_TYPE",
        "duplicateArticleTarget": "ERRORS.SETUP.DISCOUNTS.DUPLICATE_ARTICLE_TARGET",
        "missingPercentage": "ERRORS.SETUP.DISCOUNTS.MISSING_PERCENTAGE",
    },
    'booking_rules': {
        "invalidBookingRules": "ERRORS.SETUP.BOOKING_RULES.INVALID_BOOKING_RULES",
        "invalidEmailReminders": "ERRORS.SETUP.BOOKING_RULES.INVALID_EMAIL_REMINDERS",
        "invalidSmsReminders": "ERRORS.SETUP.BOOKING_RULES.INVALID_SMS_REMINDERS",
        "invalidMinAhead": "ERRORS.SETUP.BOOKING_RULES.INVALID_MIN_AHEAD",
        "invalidMaxAhead": "ERRORS.SETUP.BOOKING_RULES.INVALID_MAX_AHEAD",
        "minAheadExceedsMaxAhead": "ERRORS.SETUP.BOOKING_RULES.MIN_AHEAD_EXCEEDS_MAX_AHEAD",
        "missingMinAhead": "ERRORS.SETUP.BOOKING_RULES.MISSING_MIN_AHEAD",
        "missingMaxAhead": "ERRORS.SETUP.BOOKING_RULES.MISSING_MAX_AHEAD",
    }
}
export const COUNTRIES: string[] = [
  "Andorra",
  "Azərbaycan",
  "België",
  "Bosna i Hercegovina",
  "Città del Vaticano",
  "Crna Gora",
  "Česko",
  "Danmark",
  "Deutschland",
  "Eesti",
  "España",
  "Éire",
  "France",
  "Hrvatska",
  "Ísland",
  "Italia",
  "Latvija",
  "Lëtzebuerg",
  "Liechtenstein",
  "Lietuva",
  "Magyarország",
  "Malta",
  "Monaco",
  "Moldova",
  "Nederland",
  "Norge",
  "Österreich",
  "Polska",
  "Portugal",
  "România",
  "San Marino",
  "Schweiz",
  "Shqipëria",
  "Slovenija",
  "Slovensko",
  "Suomi",
  "Sverige",
  "Türkiye",
  "United Kingdom",
  "Беларусь",
  "България",
  "Ελλάδα",
  "Κύπρος",
  "Հայաստան",
  "საქართველო",
  "Қазақстан",
  "Россия",
  "Северна Македонија",
  "Србија",
  "Україна"
];
export const COUNTRY_TIME_ZONE: Map<string, string> = new Map([
  ["Andorra", "Europe/Andorra"],
  ["Azərbaycan", "Asia/Baku"],
  ["België", "Europe/Brussels"],
  ["Bosna i Hercegovina", "Europe/Belgrade"],
  ["Città del Vaticano", "Europe/Rome"],
  ["Crna Gora", "Europe/Belgrade"],
  ["Česko", "Europe/Prague"],
  ["Danmark", "Europe/Copenhagen"],
  ["Deutschland", "Europe/Berlin"],
  ["Eesti", "Europe/Tallinn"],
  ["España", "Europe/Madrid"],
  ["Éire", "Europe/Dublin"],
  ["France", "Europe/Paris"],
  ["Hrvatska", "Europe/Belgrade"],
  ["Ísland", "Atlantic/Reykjavik"],
  ["Italia", "Europe/Rome"],
  ["Latvija", "Europe/Riga"],
  ["Lëtzebuerg", "Europe/Luxembourg"],
  ["Liechtenstein", "Europe/Zurich"],
  ["Lietuva", "Europe/Vilnius"],
  ["Magyarország", "Europe/Budapest"],
  ["Malta", "Europe/Malta"],
  ["Monaco", "Europe/Monaco"],
  ["Moldova", "Europe/Chisinau"],
  ["Nederland", "Europe/Amsterdam"],
  ["Norge", "Europe/Oslo"],
  ["Österreich", "Europe/Vienna"],
  ["Polska", "Europe/Warsaw"],
  ["Portugal", "Europe/Lisbon"],
  ["România", "Europe/Bucharest"],
  ["San Marino", "Europe/Rome"],
  ["Schweiz", "Europe/Zurich"],
  ["Shqipëria", "Europe/Tirane"],
  ["Slovenija", "Europe/Belgrade"],
  ["Slovensko", "Europe/Prague"],
  ["Suomi", "Europe/Helsinki"],
  ["Sverige", "Europe/Stockholm"],
  ["Türkiye", "Europe/Istanbul"],
  ["United Kingdom", "Europe/London"],
  ["Беларусь", "Europe/Minsk"],
  ["България", "Europe/Sofia"],
  ["Ελλάδα", "Europe/Athens"],
  ["Κύπρος", "Asia/Nicosia"],
  ["Հայաստան", "Asia/Yerevan"],
  ["საქართველო", "Asia/Tbilisi"],
  ["Қазақстан", "Asia/Almaty"],
  ["Россия", "Europe/Moscow"],
  ["Северна Македонија", "Europe/Belgrade"],
  ["Србија", "Europe/Belgrade"],
  ["Україна", "Europe/Kyiv"]
]);
export const COUNTRY_CURRENCY: Map<string, string> = new Map([
  ["Andorra", "EUR"],
  ["Azərbaycan", "AZN"],
  ["België", "EUR"],
  ["Bosna i Hercegovina", "BAM"],
  ["Città del Vaticano", "EUR"],
  ["Crna Gora", "EUR"],
  ["Česko", "CZK"],
  ["Danmark", "DKK"],
  ["Deutschland", "EUR"],
  ["Eesti", "EUR"],
  ["España", "EUR"],
  ["Éire", "EUR"],
  ["France", "EUR"],
  ["Hrvatska", "EUR"],
  ["Ísland", "ISK"],
  ["Italia", "EUR"],
  ["Latvija", "EUR"],
  ["Lëtzebuerg", "EUR"],
  ["Liechtenstein", "CHF"],
  ["Lietuva", "EUR"],
  ["Magyarország", "HUF"],
  ["Malta", "EUR"],
  ["Monaco", "EUR"],
  ["Moldova", "MDL"],
  ["Nederland", "EUR"],
  ["Norge", "NOK"],
  ["Österreich", "EUR"],
  ["Polska", "PLN"],
  ["Portugal", "EUR"],
  ["România", "RON"],
  ["San Marino", "EUR"],
  ["Schweiz", "CHF"],
  ["Shqipëria", "ALL"],
  ["Slovenija", "EUR"],
  ["Slovensko", "EUR"],
  ["Suomi", "EUR"],
  ["Sverige", "SEK"],
  ["Türkiye", "TRY"],
  ["United Kingdom", "GBP"],
  ["Беларусь", "BYN"],
  ["България", "BGN"],
  ["Ελλάδα", "EUR"],
  ["Κύπρος", "EUR"],
  ["Հայաստան", "AMD"],
  ["საქართველო", "GEL"],
  ["Қазақстан", "USD"], // constrained to allowed list
  ["Россия", "RUB"],
  ["Северна Македонија", "MKD"],
  ["Србија", "RSD"],
  ["Україна", "UAH"]
]);

export const DAY_OF_WEEK: Record<string, number> = {
  'DATE.MONDAY':    1,
  'DATE.TUESDAY':   2,
  'DATE.WEDNESDAY': 3,
  'DATE.THURSDAY':  4,
  'DATE.FRIDAY':    5,
  'DATE.SATURDAY':  6,
  'DATE.SUNDAY':    7,
};
export const DAY_KEYS = [
'DATE.SUNDAY',
'DATE.MONDAY',
'DATE.TUESDAY',
'DATE.WEDNESDAY',
'DATE.THURSDAY',
'DATE.FRIDAY',
'DATE.SATURDAY'
];


// TESTING
// Random amount 1-4
const getRandomAmount = (min: number, max: number): number => {
    return Math.floor(Math.random() * max) + min;
};

export const getRandomStudioKeys = (): string[] => {
    const keys = Object.keys(STUDIO_TYPES);
    const amount = getRandomAmount(1, 5);
    const shuffled = [...keys].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, amount);
};

export const getRandomServiceKeys = (): string[] => {
    const keys = Object.keys(SERVICE_TYPES);
    const amount = getRandomAmount(1, 3);
    const shuffled = [...keys].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, amount);
};



