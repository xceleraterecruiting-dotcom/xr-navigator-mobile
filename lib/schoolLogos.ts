// ESPN CDN School Logo Mapping
// URL Pattern: https://a.espncdn.com/i/teamlogos/ncaa/500/{id}.png

// Map of school names (normalized) to ESPN team IDs
const SCHOOL_ESPN_IDS: Record<string, number> = {
  // SEC
  'alabama': 333,
  'arkansas': 8,
  'auburn': 2,
  'florida': 57,
  'georgia': 61,
  'kentucky': 96,
  'lsu': 99,
  'mississippi state': 344,
  'missouri': 142,
  'oklahoma': 201,
  'ole miss': 145,
  'south carolina': 2579,
  'tennessee': 2633,
  'texas': 251,
  'texas a&m': 245,
  'vanderbilt': 238,

  // Big Ten
  'illinois': 356,
  'indiana': 84,
  'iowa': 2294,
  'maryland': 120,
  'michigan': 130,
  'michigan state': 127,
  'minnesota': 135,
  'nebraska': 158,
  'northwestern': 77,
  'ohio state': 194,
  'oregon': 2483,
  'penn state': 213,
  'purdue': 2509,
  'rutgers': 164,
  'ucla': 26,
  'usc': 30,
  'washington': 264,
  'wisconsin': 275,

  // Big 12
  'arizona': 12,
  'arizona state': 9,
  'baylor': 239,
  'byu': 252,
  'brigham young': 252,
  'cincinnati': 2132,
  'colorado': 38,
  'houston': 248,
  'iowa state': 66,
  'kansas': 2305,
  'kansas state': 2306,
  'oklahoma state': 197,
  'tcu': 2628,
  'texas christian': 2628,
  'texas tech': 2641,
  'ucf': 2116,
  'utah': 254,
  'west virginia': 277,

  // ACC
  'boston college': 103,
  'california': 25,
  'cal': 25,
  'cal berkeley': 25,
  'california berkeley': 25,
  'southern california': 30,
  'california los angeles': 26,
  'clemson': 228,
  'duke': 150,
  'florida state': 52,
  'georgia tech': 59,
  'louisville': 97,
  'miami': 2390,
  'nc state': 152,
  'nc': 152,
  'ncsu': 152,
  'north carolina state': 152,
  'north carolina': 153,
  'unc': 153,
  'pittsburgh': 221,
  'smu': 2567,
  'stanford': 24,
  'syracuse': 183,
  'virginia': 258,
  'virginia tech': 259,
  'wake forest': 154,

  // Group of 5 - AAC
  'army': 349,
  'charlotte': 2429,
  'east carolina': 151,
  'fau': 2226,
  'florida atlantic': 2226,
  'memphis': 235,
  'navy': 2426,
  'north texas': 249,
  'rice': 242,
  'south florida': 58,
  'tulane': 2655,
  'tulsa': 202,
  'uab': 5,
  'usf': 58,
  'utsa': 2636,

  // Group of 5 - Mountain West
  'air force': 2005,
  'boise state': 68,
  'colorado state': 36,
  'fresno state': 278,
  'hawaii': 62,
  'nevada': 2440,
  'new mexico': 167,
  'san diego state': 21,
  'san jose state': 23,
  'unlv': 2439,
  'utah state': 328,
  'wyoming': 2704,

  // Group of 5 - MAC
  'akron': 2006,
  'ball state': 2050,
  'bowling green': 189,
  'buffalo': 2084,
  'central michigan': 2117,
  'eastern michigan': 2199,
  'kent state': 2309,
  'miami (oh)': 193,
  'miami ohio': 193,
  'northern illinois': 2459,
  'ohio': 195,
  'toledo': 2649,
  'western michigan': 2711,

  // Group of 5 - Sun Belt
  'appalachian state': 2026,
  'arkansas state': 2032,
  'coastal carolina': 324,
  'georgia southern': 290,
  'georgia state': 2247,
  'james madison': 256,
  'louisiana': 309,
  'louisiana-lafayette': 309,
  'louisiana-monroe': 2433,
  'marshall': 276,
  'old dominion': 295,
  'southern miss': 2572,
  'southern mississippi': 2572,
  'south alabama': 6,
  'texas state': 326,
  'troy': 2653,

  // FBS Independents
  'notre dame': 87,
  'uconn': 41,
  'connecticut': 41,
  'umass': 113,
  'massachusetts': 113,

  // FCS - Big Sky
  'montana': 149,
  'montana state': 147,
  'eastern washington': 331,
  'weber state': 2692,
  'northern arizona': 2464,
  'sacramento state': 16,
  'portland state': 2502,
  'uc davis': 302,
  'cal poly': 13,
  'idaho': 70,
  'idaho state': 304,
  'southern utah': 253,
  'northern colorado': 2458,

  // FCS - CAA
  'north dakota state': 2449,
  'south dakota state': 2571,
  'villanova': 222,
  'delaware': 48,
  'richmond': 257,
  'william & mary': 2729,
  'new hampshire': 160,
  'maine': 311,
  'towson': 119,
  'stony brook': 2619,
  'rhode island': 227,
  'elon': 2210,

  // FCS - Ivy League
  'yale': 43,
  'harvard': 108,
  'princeton': 163,
  'penn': 219,
  'columbia': 171,
  'brown': 225,
  'dartmouth': 159,
  'cornell': 172,

  // FCS - SWAC
  'jackson state': 2296,
  'grambling state': 2755,
  'grambling': 2755,
  'southern university': 2582,
  'prairie view a&m': 2504,
  'texas southern': 2640,
  'alcorn state': 2016,
  'alabama a&m': 2010,
  'alabama state': 2011,
  'arkansas-pine bluff': 2029,
  'mississippi valley state': 2400,
  'bethune-cookman': 2065,
  'florida a&m': 50,

  // FCS - MEAC
  'norfolk state': 2450,
  'howard': 47,
  'morgan state': 2415,
  'north carolina a&t': 2448,
  'south carolina state': 2569,
  'delaware state': 2169,
  'north carolina central': 2428,

  // FCS - Southern Conference
  'the citadel': 2643,
  'citadel': 2643,
  'vmi': 2678,
  'wofford': 2747,
  'furman': 231,
  'chattanooga': 236,
  'east tennessee state': 2193,
  'etsu': 2193,
  'western carolina': 2717,
  'mercer': 2382,
  'samford': 2535,

  // FCS - Missouri Valley
  'north dakota': 155,
  'south dakota': 233,
  'illinois state': 2287,
  'indiana state': 282,
  'missouri state': 2623,
  'northern iowa': 2460,
  'southern illinois': 79,
  'western illinois': 2710,
  'youngstown state': 2754,

  // FCS - Southland/WAC
  'incarnate word': 2916,
  'lamar': 2320,
  'mcneese state': 2377,
  'nicholls state': 2447,
  'northwestern state': 2466,
  'southeastern louisiana': 2545,
  'stephen f. austin': 2617,
  'stephen f austin': 2617,
  'central arkansas': 2110,
  'houston christian': 2277,

  // FCS - OVC/Big South
  'tennessee state': 2634,
  'tennessee tech': 2635,
  'ut martin': 2630,
  'eastern illinois': 2197,
  'southeast missouri': 2546,
  'morehead state': 2413,
  'lindenwood': 3209,
  'charleston southern': 2127,

  // FCS - Patriot League
  'lehigh': 2329,
  'lafayette': 322,
  'colgate': 2142,
  'holy cross': 107,
  'fordham': 2230,
  'georgetown': 2245,
  'bucknell': 2083,

  // FCS - Northeast/Pioneer
  'duquesne': 2184,
  'sacred heart': 2529,
  'monmouth': 2919,
  'robert morris': 2523,
  'long island': 2341,
  'stonehill': 284,
  'campbell': 2097,
  'presbyterian': 2506,

  // FCS - Other
  'central connecticut state': 2115,
  'central connecticut': 2115,
  'liberty': 2335,
  'kennesaw state': 338,
  'jacksonville state': 55,
  'sam houston': 2534,
  'sam houston state': 2534,
  'tarleton state': 2627,
  'eastern kentucky': 2198,
  'western kentucky': 98,
  'wku': 98,
  'middle tennessee': 2393,
  'fiu': 2229,
  'florida international': 2229,
  'louisiana tech': 2348,
  'new mexico state': 166,
  'utep': 2638,
  'temple': 218,
  'east central': 2191,
  'eastern new mexico': 2201,

  // D2 - Notable
  'davenport': 110254,
  'davenport university': 110254,
  'ferris state': 2226,
  'grand valley state': 2253,
  'northwest missouri state': 2460,
  'pittsburg state': 2504,
  'valdosta state': 2673,
  'ashland': 308,
  'colorado mesa': 11,
  'colorado state pueblo': 2570,
  'csu pueblo': 2570,
  'western colorado': 2714,
  'adams state': 2001,
  'delta state': 2170,
  'bemidji state': 132,
  'black hills state': 2069,
  'winona state': 2851,
  'wayne state': 131,
  'washburn': 2687,
  'mercyhurst': 2385,
  'edinboro': 2205,
  'central state': 2119,
  'concord': 2148,
  'bluefield state': 124180,
  'wheeling': 112335,
  'new haven': 2441,
  'assumption': 2038,
  'bentley': 2060,
  'american international': 2022,
  'bridgewater state': 18,
  'west georgia': 2756,
  'central washington': 2126,
  'california lutheran': 109232,
  'california pennsylvania': 2858,

  // D3 - Notable
  'mount union': 2416,
  'north central': 2454,
  'adrian': 2003,
  'albion': 2790,
  'allegheny': 2018,
  'bates': 121,
  'beloit': 266,
  'benedictine': 2283,
  'bowdoin': 340,
  'buena vista': 63,
  'capital': 424,
  'loras': 263,
  'luther': 67,
  'manchester': 2362,
  'marietta': 317,
  'martin luther': 446,
  'millikin': 74,
  'millsaps': 2398,
  'misericordia': 2969,
  'rockford': 2524,
  'stevenson': 471,
  'trine': 2651,
  'aurora': 2044,
  'calvin': 129738,
  'wingate': 351,

  // NAIA/Other
  'albright': 2015,
  'allen': 2019,
  'averett': 2047,
  'baldwin wallace': 188,
  'belhaven': 2056,
  'berry': 2757,
  'brevard': 2913,
  'bridgewater': 2079,
  'carson-newman': 2105,
  'chowan': 2804,
  'clark atlanta': 2805,
  'norwich': 2467,
  'pacific': 205,
  'rowan': 2827,
  'salisbury': 2532,
  'alfred state': 3162,
  'alfred': 365,
  'albany state': 2013,
  'stetson': 56,
  'saint francis': 2598,
  'st. thomas': 2900,
  'st thomas': 2900,
  'southern methodist': 2567,

  // Additional common variations
  'university of alabama': 333,
  'university of michigan': 130,
  'university of texas': 251,
  'texas austin': 251,
  'university of georgia': 61,
  'university of florida': 57,
  'the ohio state university': 194,
  'ohio state university': 194,
  'texas a&m university': 245,
  'louisiana state': 99,
  'louisiana state university': 99,
  'university of mississippi': 145,
  'university of connecticut': 41,
  'brigham young university': 252,
  'university of south florida': 58,
  'university of central florida': 2116,
  'university of houston': 248,
  'university of memphis': 235,
  'dayton': 2168,
  'davidson': 2166,
  'drake': 2181,
  'butler': 2086,
  'valparaiso': 2674,
  'wagner': 2681,
  'marist': 2368,
  'hampton': 2261,

  // Normalized variations
  'central florida': 2116,

  // Schools that need exact matching to avoid confusion
  'n.c. state': 152,
  'washington state': 265,
  'wazzu': 265,
  'miami university': 193,
  'miami (ohio)': 193,

  // Additional schools found in database
  'abilene christian': 2000,
  'abilene christian university': 2000,
  'bryant': 2803,
  'bryant university': 2803,
  'gardner-webb': 2241,
  'gardner-webb university': 2241,
  'merrimack': 2771,
  'merrimack college': 2771,
  'murray state': 93,
  'murray state university': 93,
  'prairie view a & m': 2504,
  'prairie view a & m university': 2504,
  'suny albany': 399,
  'suny university at albany': 399,
  'albany': 399,
  'southern university & a&m college': 2582,
  'southern university & a&m': 2582,
  'southern & a&m': 2582,
  'san diego': 301,
  'university of san diego': 301,

  // Schools that previously resolved to WRONG logos due to partial matching
  'north alabama': 2453,
  'university of north alabama': 2453,
  'ulm': 2433,
  'louisiana monroe': 2433,
  'arkansas tech': 2033,
  'oregon state': 204,
  'western oregon': 2848,
  'kennesaw state university': 338,
  'augustana': 2043,
  'west liberty': 2699,
  'west virginia state': 2707,
  'western new mexico': 2703,
  'utrgv': 292,
  'concordia st. paul': 3066,
  'north carolina charlotte': 2429,
  'unc charlotte': 2429,
  'uncc': 2429,
  'buffalo state': 2085,
  'bloomsburg': 2071,
  'clarion': 2134,
  'east stroudsburg': 2188,
  'west chester': 223,
  'cal u': 2858,
  'nevada las vegas': 2439,
  'tennessee martin': 2630,
  'tennessee chattanooga': 236,
  'jacksonville state university': 55,
  'valdosta state university': 2673,
  'austin peay': 2046,
  'austin peay state': 2046,
  'southeastern': 2545,

  // Explicit entries for common normalizations
  'pennsylvania': 219,
  'mississippi': 145,
  'bloomsburg pennsylvania': 2071,
  'clarion pennsylvania': 2134,
  'east stroudsburg pennsylvania': 2188,
  'west chester pennsylvania': 223,
  'california state fresno': 278,
  'texas rio grande valley': 292,
  'augustana south dakota': 2043,
  'anderson south carolina': 129469,
  'concordia minnesota': 3066,

  // Hyphenated school names (hyphens normalize to spaces)
  'bethune cookman': 2065,
  'carson newman': 2105,
  'gardner webb': 2241,
  'arkansas pine bluff': 2029,

  // Short-name schools that lose "College"/"University" in normalization
  'boston': 103,
  'southern': 2582,
}

/**
 * Get ESPN logo URL for a school
 */
export function getSchoolLogoUrl(schoolName: string): string | null {
  if (!schoolName) return null

  // Special case: "Miami University" is Miami (OH), not Miami (FL)
  const lowerName = schoolName.toLowerCase()
  if (lowerName === 'miami university' || lowerName.includes('miami university')) {
    return `https://a.espncdn.com/i/teamlogos/ncaa/500/193.png`
  }

  // Normalize school name for lookup
  const normalized = schoolName
    .toLowerCase()
    .replace(/university/gi, '')
    .replace(/college/gi, '')
    .replace(/\bof\b/gi, '')
    .replace(/\bat\b/gi, '')
    .replace(/state university/gi, 'state')
    .replace(/,/g, '')
    .replace(/[–—\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Try exact match first
  let espnId = SCHOOL_ESPN_IDS[normalized]

  // Try partial matches if no exact match
  // Only check if the normalized input CONTAINS a key (not the reverse!)
  // Sort by key length descending to prefer longer/more specific matches
  if (!espnId) {
    const sortedEntries = Object.entries(SCHOOL_ESPN_IDS)
      .sort((a, b) => b[0].length - a[0].length)

    for (const [key, id] of sortedEntries) {
      if (key.length < 4) continue
      if (normalized.includes(key)) {
        espnId = id
        break
      }
    }
  }

  if (!espnId) return null

  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${espnId}.png`
}
