"""Build data/market-studies.json: ATCO internal market studies for the shortlist sites.

Inputs are hand-entered below with a source tag on every figure:
  V  = read from the cited public source (state licensing data, ACS via incomebyzipcode, listings)
  I  = ATCO estimate (method stated)
Run: python3 scripts/build_market_studies.py
"""
import json, math, os
from statistics import NormalDist

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AS_OF = "2026-11-05"
N = NormalDist()

# ---- method ---------------------------------------------------------------
HH_PER_75 = 0.67          # households per person 75+ (same as data/absorption.json)
NEED, NEED_HI = 0.10, 0.12
PMA_SHARE = 0.75          # share of AL/MC move-ins from the PMA
IL_PROPENSITY, IL_PROPENSITY_HI = 0.10, 0.125
IL_PMA_SHARE = 0.65
SIGMA = 1.10              # lognormal spread of 65+ household income, calibrated so Florham Park's ZIP medians
                          # reproduce its tract-level ACS share at $75k+ (61.9%, data/absorption.json)

# County 75+ share of total population (ACS 2019-23 75+ from research/county_markets.csv / 2020 Census totals)
COUNTY75 = {
    "Morris NJ": 39769 / 509285, "Essex NJ": 49013 / 863728, "Passaic NJ": 33473 / 524118, "Union NJ": 35054 / 575345,
    "Westchester NY": 78255 / 1004457, "Putnam NY": 7339 / 97668, "Fairfield CT": 65729 / 957419, "New Haven CT": 63430 / 864835,
}

def share_above(median, threshold):
    if not median:
        return None
    return 1 - N.cdf(math.log(threshold / median) / SIGMA)

def hav(a, b):
    R = 3958.8
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))

# ---- ZIP 65+ median household income, ACS 2024 5-year (incomebyzipcode.com, pulled 2026-11-05) ----------
ZIP65 = {
    "07045": 80511, "07082": 90268, "07058": 151384, "07035": 74868, "07444": 73534, "07005": 88529, "07405": 81964,
    "07046": 194904, "07834": 98068, "07054": 67847, "07004": 84490, "07470": 106889, "07936": 95375, "07006": 85954,
    "07932": 114471, "07940": 95556, "07928": 108081, "07039": 132875, "07960": 123869, "07981": 88889, "07901": 88429,
    "07950": 87852, "07068": 92162,
    "10567": 102228, "10566": 64015, "10520": 74291, "10598": 103162, "10547": 122523, "10562": 84030, "10510": 126103,
    "10579": 81630, "10589": 101029, "10514": 156852, "10549": 87419, "10535": 123810,
    "10573": 73478, "10580": 76500, "10528": 94038, "10577": 250001, "10543": 94688, "10538": 95994, "10605": 102917,
    "10604": 92500, "10606": 80845, "10504": 152448, "10583": 131205,
    "06830": 108456, "06831": 180833, "06878": 233565, "06807": 113021, "06902": 62003, "06903": 146111, "06905": 116830,
    "06611": 91476, "06468": 97386, "06484": 74353, "06824": 110650, "06825": 81422, "06890": 132708, "06612": 201923,
    "06614": 72378, "06615": 54347, "06606": 59723, "06460": 64658, "06477": 110549, "06418": 36786, "06470": 104083,
}
def zipmed(zs):
    v = [ZIP65[z] for z in zs if z in ZIP65]
    return round(sum(v) / len(v)) if v else None

# Town rows: name, county, 2020 Census population (rounded), share of the town inside the PMA, ZIPs for income, lat, lon
STUDIES = {}

STUDIES["NJ-04"] = dict(
    site=(40.79302, -74.37645),
    pma_label="7-mile radius (about 15-20 minutes), the Morris 'golden triangle' plus West Essex and the Summit corridor",
    pma_why="Matches the 7-mile, tract-level market already used in the site dossier. Route 24 and I-287 tie Florham Park to Madison, Chatham, Morristown and Summit; Route 10 to Livingston and East Hanover. Adult children in these towns are the main referral source.",
    tract=dict(pop75=28680, share75k=0.619, src="ACS 2024 5-year, census tracts within 7 miles (B01001, B19037), data/absorption.json"),
    towns=[
        ("Florham Park", "Morris NJ", 12585, 1, ["07932"]), ("Madison", "Morris NJ", 16937, 1, ["07940"]),
        ("Chatham Borough", "Morris NJ", 9212, 1, ["07928"]), ("Chatham Township", "Morris NJ", 10983, 1, ["07928"]),
        ("East Hanover", "Morris NJ", 11157, 1, ["07936"]), ("Hanover Township (Whippany, Cedar Knolls)", "Morris NJ", 14677, 1, ["07981"]),
        ("Morris Plains", "Morris NJ", 6153, 1, ["07950"]), ("Morris Township", "Morris NJ", 22974, 1, ["07960"]),
        ("Morristown", "Morris NJ", 20180, 1, ["07960"]), ("Harding", "Morris NJ", 3871, 1, []),
        ("Parsippany-Troy Hills (south half)", "Morris NJ", 56162, 0.5, ["07054"]),
        ("Livingston", "Essex NJ", 31330, 1, ["07039"]), ("Roseland", "Essex NJ", 6299, 1, ["07068"]),
        ("Millburn / Short Hills", "Essex NJ", 21710, 1, []), ("West Orange (west half)", "Essex NJ", 48843, 0.5, []),
        ("Summit", "Union NJ", 22719, 1, ["07901"]), ("New Providence", "Union NJ", 13650, 1, []),
    ],
    supply_src="Morris County Housing Options 2024 (licensed AL residences and units); operator and press releases for Essex and Union",
    supply=[
        ("Brighton Gardens of Florham Park", "Florham Park", "AL/MC", 116, "V", 1997),
        ("Brookdale Florham Park", "Florham Park", "AL", 68, "V", None),
        ("The Delaney at The Green (AL/MC share of 220)", "Florham Park", "AL/MC", 70, "I", 2021),
        ("Arden Courts of Whippany", "Hanover Twp", "MC", 60, "V", None),
        ("Weston Assisted Living", "Hanover Twp", "AL", 60, "V", None),
        ("Lester Senior Housing (AL)", "Hanover Twp", "AL", 55, "V", None),
        ("CareOne at Morris (AL)", "Parsippany", "AL", 61, "V", None),
        ("Juniper Village at Chatham", "Chatham", "AL/MC", 95, "V", None),
        ("Spring Hills Morristown", "Morristown", "AL/MC", 104, "V", None),
        ("Sunrise of Madison", "Madison", "AL/MC", 80, "V", None),
        ("Sunrise of Morris Plains", "Morris Plains", "AL/MC", 90, "V", None),
        ("Sunrise of Livingston", "Livingston", "AL/MC", 100, "I", None),
        ("CareOne at Livingston (AL)", "Livingston", "AL", 80, "I", None),
        ("Spring Hills Livingston", "Livingston", "AL/MC", 90, "I", None),
    ],
    pipeline=[
        ("Arbor Terrace Florham Park", "AL/MC", 80, "100-bed ERCN May 2024; construction from Oct 2026", "counted", (40.786, -74.398), "https://www.newswire.com/news/construction-set-to-begin-on-arbor-terrace-florham-park-senior-living-community"),
        ("Woodmont Senior Living, 79 Interpace Pkwy, Parsippany", "AL/MC (of 150 total)", 80, "Site plan approved Oct 2022 (52 AL + 28 MC + 70 IL); nothing built or financed since", "contingent", (40.861, -74.414), "https://parsippanyfocus.com/?p=108979"),
        ("Benchmark at Cedar Grove", "IL/AL/MC", 138, "Under construction since June 2025; opens 2027", "secondary", (40.852, -74.229), "https://www.benchmarkseniorliving.com/news-article/benchmark-senior-living-to-open-retirement-community-in-cedar-grove-nj/"),
        ("Peapack Senior Living, 400 Essex Blvd", "AL/MC", 96, "Expedited CN July 10, 2026 (115 beds, 32 dementia); $57.2M", "secondary", (40.715, -74.657), "https://www.nj.gov/health/healthfacilities/documents/CN/2026/ercn-peapack-senior-living.pdf"),
    ],
    rent_key="NJ-04",
    product="almc",
)

STUDIES["NJ-10"] = dict(
    site=(40.91, -74.36),
    pma_label="7-mile radius (about 15 minutes): Montville, the Route 23 / Route 202 corridor, Wayne and the Caldwells",
    pma_why="Route 287, Route 46 and Route 23 converge near the site. The market runs north to Kinnelon and Butler, east into Wayne and the Caldwells, and south to Parsippany and East Hanover. The Morris 'golden triangle' (Morristown, Madison, Florham Park) is outside it, and that matters for rents.",
    towns=[
        ("Montville (Towaco, Pine Brook)", "Morris NJ", 22450, 1, ["07045", "07082", "07058"]),
        ("Lincoln Park", "Morris NJ", 10915, 1, ["07035"]), ("Pequannock (Pompton Plains)", "Morris NJ", 15571, 1, ["07444"]),
        ("Boonton", "Morris NJ", 8815, 1, ["07005"]), ("Boonton Township", "Morris NJ", 4263, 1, ["07005"]),
        ("Kinnelon", "Morris NJ", 10248, 1, ["07405"]), ("Butler", "Morris NJ", 8307, 1, ["07405"]),
        ("Mountain Lakes", "Morris NJ", 4472, 1, ["07046"]), ("Denville", "Morris NJ", 17107, 1, ["07834"]),
        ("Parsippany-Troy Hills", "Morris NJ", 56162, 1, ["07054"]), ("East Hanover", "Morris NJ", 11157, 1, ["07936"]),
        ("Hanover Township (Whippany)", "Morris NJ", 14677, 0.5, ["07981"]),
        ("Fairfield", "Essex NJ", 7872, 1, ["07004"]), ("West Caldwell / Caldwell / North Caldwell", "Essex NJ", 26667, 1, ["07006"]),
        ("Wayne", "Passaic NJ", 54838, 1, ["07470"]),
    ],
    supply_src="Morris County Housing Options 2024 (licensed AL units); Caring.com listings for Passaic and Essex communities (capacity estimated where not published)",
    supply=[
        ("Chelsea / Mira Vie at Montville", "Montville", "AL/MC", 152, "V", None),
        ("Fox Trail Memory Care at Montville", "Montville", "MC", 15, "I", None),
        ("Victoria Mews Assisted Living", "Boonton Twp", "AL/MC", 97, "V", None),
        ("CareOne at Morris (AL)", "Parsippany", "AL", 61, "V", None),
        ("Sunrise of Mountain Lakes", "Mountain Lakes", "AL/MC", 80, "I", None),
        ("Carriage House of Lincoln Park", "Lincoln Park", "AL", 30, "I", None),
        ("Sunrise of Wayne", "Wayne", "AL/MC", 85, "I", None),
        ("Brookdale Wayne", "Wayne", "AL/MC", 80, "I", None),
        ("The Bristal at Wayne", "Wayne", "AL/MC", 130, "I", None),
        ("CareOne at Wayne (AL)", "Wayne", "AL", 80, "I", None),
        ("Sunrise of West Essex", "Fairfield", "AL/MC", 80, "I", None),
        ("Arden Courts of Whippany", "Hanover Twp", "MC", 60, "V", None),
        ("Weston Assisted Living", "Hanover Twp", "AL", 60, "V", None),
    ],
    pipeline=[
        ("Woodmont Senior Living, 79 Interpace Pkwy, Parsippany", "AL/MC (of 150 total)", 80, "Site plan approved Oct 2022; nothing built or financed since", "contingent", (40.861, -74.414), "https://parsippanyfocus.com/?p=108979"),
        ("Benchmark at Cedar Grove", "IL/AL/MC", 138, "Under construction since June 2025; opens 2027. Counted at its estimated AL/MC share", "counted_part", (40.852, -74.229), "https://www.benchmarkseniorliving.com/news-article/benchmark-senior-living-to-open-retirement-community-in-cedar-grove-nj/"),
        ("Arbor Terrace Florham Park", "AL/MC", 80, "ERCN 2024; construction from Oct 2026", "secondary", (40.786, -74.398), "https://www.newswire.com/news/construction-set-to-begin-on-arbor-terrace-florham-park-senior-living-community"),
        ("Peapack Senior Living", "AL/MC", 96, "Expedited CN July 2026", "secondary", (40.715, -74.657), "https://www.nj.gov/health/healthfacilities/documents/CN/2026/ercn-peapack-senior-living.pdf"),
    ],
    cedar_grove_almc=90,
    local_comps=[
        ("Sunrise of Mountain Lakes", "Mountain Lakes", 9971, "Class A; another Caring page shows $5,533"),
        ("Sunrise of West Essex", "Fairfield", 8238, "Class A"),
        ("Fox Trail Memory Care", "Montville", 7500, "Small MC home"),
        ("Brookdale Wayne", "Wayne", 5975, "Older"),
        ("Sunrise of Wayne", "Wayne", 5654, "Older"),
        ("The Bristal at Wayne", "Wayne", 5400, "Starting price"),
        ("Mira Vie at Montville", "Montville", 4825, "Older; 152 units"),
        ("CareOne at Wayne", "Wayne", 4562, "Older"),
        ("CareOne at Parsippany", "Parsippany", 4200, "Older"),
    ],
    local_comps_src=[("Caring.com Wayne, Montville, Parsippany listings (listed prices, Nov 2026; not a rate shop)", "https://www.caring.com/senior-living/assisted-living/new-jersey/wayne")],
    rent_key="NJ-10",
    product="almc",
)

STUDIES["NY-03"] = dict(
    site=(41.29025, -73.88823),
    pma_label="About 8 miles east of the Hudson (15-20 minutes): Cortlandt, Peekskill, Yorktown, Putnam Valley, Ossining and Briarcliff, Somers and New Castle",
    pma_why="The Hudson is a hard edge: Rockland across the Bear Mountain Bridge is excluded. The site sits on Route 202/35 across from NYP Hudson Valley Hospital, the medical anchor for northern Westchester, and the Taconic and Route 9 pull in Ossining, Briarcliff and New Castle. A strict 7-mile ring would be about 120,000 people and too thin to judge.",
    towns=[
        ("Cortlandt (incl. Croton-on-Hudson, Buchanan)", "Westchester NY", 43470, 1, ["10567", "10520"]),
        ("Peekskill", "Westchester NY", 25431, 1, ["10566"]),
        ("Yorktown (incl. Mohegan Lake)", "Westchester NY", 36569, 1, ["10598", "10547"]),
        ("Putnam Valley", "Putnam NY", 11617, 1, ["10579"]),
        ("Ossining (town)", "Westchester NY", 40061, 1, ["10562"]),
        ("Briarcliff Manor / Mount Pleasant (north)", "Westchester NY", 7569, 1, ["10510"]),
        ("Somers", "Westchester NY", 21939, 1, ["10589"]),
        ("New Castle (Chappaqua)", "Westchester NY", 18180, 1, ["10514"]),
        ("Philipstown (Cold Spring, Garrison)", "Putnam NY", 9981, 0.5, []),
    ],
    supply_src="NYS DOH Adult Care Facility quarterly statistical report, 2026 Q2 (certified beds and resident census), health.data.ny.gov h5s5-hcxg; facility file vn5v-hh5r",
    supply_src_url="https://health.data.ny.gov/resource/h5s5-hcxg.json?county=Westchester&reporting_year=2026&reporting_quarter=2",
    supply=[
        ("Yorktown ALR (private ALR beds)", "Cortlandt Manor", "ALR", 40, "V", 2003, 74, 85),
        ("Atria on the Hudson", "Ossining", "EHP/ALR", 185, "V", 2011, 133, 185),
        ("Atria Briarcliff Manor", "Briarcliff Manor", "AL/IL", 200, "V", 1997, 97, 200),
        ("Artis Senior Living of Briarcliff", "Briarcliff Manor", "MC (SNALR)", 64, "V", 2021, 63, 64),
        ("The Club at Briarcliff Manor", "Briarcliff Manor", "EHP/ALR", 145, "V", 2019, 118, 145),
        ("The Country House in Westchester", "Yorktown Heights", "ALR", 100, "V", 1976, 87, 100),
        ("Artis Senior Living of Somers", "Somers", "MC (ALR)", 72, "V", 2022, 66, 72),
        ("The Springvale Inn", "Croton-on-Hudson", "EHP/ALR", 125, "V", 2003, 66, 125),
    ],
    excluded=[("The Sentinel of Mohegan Lake", "188 ALP (Medicaid) beds, 180 residents: a Medicaid product, not competitive with private pay"),
              ("Yorktown ALR, ALP beds", "45 Medicaid ALP beds of its 85")],
    pipeline=[
        ("Benchmark at Mount Pleasant (Thornwood)", "ALR/MC", 114, "Opened Nov 20, 2025; 46 residents at 2026 Q2", "secondary", (41.117, -73.775), "https://westfaironline.com/apartments/benchmark-senior-facility-opens-in-thornwood"),
    ],
    rent_key="NY-03",
    product="almc",
)

STUDIES["CT-02"] = dict(
    site=(41.29026, -73.23345),
    pma_label="About 7-8 miles (15-20 minutes) along Route 8, Route 25 and the Merritt: Trumbull, Monroe, Easton, Shelton, Fairfield, Stratford, north Bridgeport and south Newtown",
    pma_why="Route 25 and Route 111 run straight through the site; Route 8 ties in Shelton and north Bridgeport; the Merritt Parkway brings in Fairfield. Only the north end of Bridgeport and the south end of Newtown are counted.",
    towns=[
        ("Trumbull", "Fairfield CT", 36827, 1, ["06611"]), ("Monroe", "Fairfield CT", 18825, 1, ["06468"]),
        ("Easton", "Fairfield CT", 7605, 1, ["06612"]), ("Shelton", "Fairfield CT", 40869, 1, ["06484"]),
        ("Fairfield (incl. Southport)", "Fairfield CT", 61512, 1, ["06824", "06825", "06890"]),
        ("Stratford", "Fairfield CT", 52355, 1, ["06614", "06615"]),
        ("Bridgeport (north end)", "Fairfield CT", 148654, 0.35, ["06606"]),
        ("Newtown (south half)", "Fairfield CT", 27173, 0.5, ["06470"]),
    ],
    supply_src="Caring.com and operator listings (Connecticut does not publish unit counts in a machine-readable list; capacities estimated)",
    supply=[
        ("Middlebrook Farms at Trumbull", "Trumbull", "AL/MC", 90, "I", None),
        ("Monarch Spring Meadows (AL share)", "Trumbull", "AL", 60, "I", None),
        ("Benchmark Senior Living at Split Rock", "Shelton", "AL/MC", 90, "I", None),
        ("Brightview Shelton (AL/MC share)", "Shelton", "AL/MC", 70, "I", None),
        ("Wesley Heights at Wesley Village (AL)", "Shelton", "AL", 40, "I", None),
        ("Just Like Home (two residential homes)", "Shelton", "AL/MC", 20, "I", None),
        ("Sunrise of Fairfield", "Fairfield", "AL/MC", 80, "I", None),
        ("Sturges Ridge of Fairfield", "Fairfield", "AL/MC", 90, "I", None),
        ("Maplewood at Southport (AL/MC share)", "Southport", "AL/MC", 70, "I", 2019),
        ("Spring Village at Stratford", "Stratford", "AL/MC", 80, "I", None),
        ("Benchmark at Newtown", "Newtown", "AL/MC", 80, "I", None),
    ],
    il_supply=[
        ("The Watermark at 3030 Park (CCRC)", "Bridgeport", 250, "I"),
        ("Wesley Village (IL)", "Shelton", 120, "I"),
        ("Maplewood at Southport (IL)", "Southport", 40, "I"),
        ("Brightview Shelton (IL)", "Shelton", 40, "I"),
        ("Monarch Spring Meadows (IL)", "Trumbull", 60, "I"),
    ],
    pipeline=[
        ("Rivers Edge, 48 Monroe Tpke (this site)", "IL/AL/MC + 147 active adult", 193, "Zone change and site plan approved 4-1; validity to confirm", "subject", (41.29026, -73.23345), "https://beta.nerej.com/340-unit-senior-housing-campus-approved-in-trumbull"),
    ],
    rent_key="CT-02",
    product="campus",
)

STUDIES["NY-01"] = dict(
    site=(41.03312, -73.67591),
    pma_label="About 7 miles (15 minutes) on I-287 and I-95: Rye Brook, Port Chester, Rye, Harrison and Purchase, Mamaroneck, White Plains, North Castle, Scarsdale, Greenwich and west Stamford",
    pma_why="The site sits at the I-287 / Hutchinson / King Street junction on the Connecticut line. Greenwich is part of the same market (backcountry Greenwich is minutes away); Long Island Sound is the south edge. Only the western half of Stamford is counted.",
    towns=[
        ("Rye Brook", "Westchester NY", 9856, 1, ["10573"]), ("Port Chester", "Westchester NY", 31693, 1, ["10573"]),
        ("Rye (city)", "Westchester NY", 16592, 1, ["10580"]), ("Harrison (incl. Purchase)", "Westchester NY", 28943, 1, ["10528", "10577"]),
        ("Mamaroneck (town, incl. Larchmont)", "Westchester NY", 31758, 1, ["10543", "10538"]),
        ("White Plains", "Westchester NY", 59559, 1, ["10605", "10604", "10606"]),
        ("North Castle (Armonk)", "Westchester NY", 12408, 1, ["10504"]), ("Scarsdale", "Westchester NY", 18253, 1, ["10583"]),
        ("Greenwich", "Fairfield CT", 63518, 1, ["06830", "06831", "06878", "06807"]),
        ("Stamford (west half)", "Fairfield CT", 135470, 0.5, ["06902", "06903", "06905"]),
    ],
    supply_src="NYS DOH Adult Care Facility quarterly statistical report, 2026 Q2 (certified beds and census); Caring.com for Greenwich and Stamford (capacities estimated)",
    supply_src_url="https://health.data.ny.gov/resource/h5s5-hcxg.json?county=Westchester&reporting_year=2026&reporting_quarter=2",
    supply=[
        ("High Point at Broadview (LCS campus)", "Purchase", "ALR/MC", 68, "V", 2025, 20, 68),
        ("The Osborn (CCRC AL)", "Rye", "EHP/ALR", 103, "V", 2012, 101, 103),
        ("Brightview Harrison", "Harrison", "EHP/ALR", 99, "V", 2024, 71, 99),
        ("The Bristal at White Plains", "White Plains", "EHP/ALR", 190, "V", 2012, 151, 190),
        ("The Ambassador at Scarsdale", "Scarsdale", "EHP/ALR", 144, "V", 2015, 117, 144),
        ("The Kensington", "White Plains", "ALR/MC", 130, "V", 2011, 91, 130),
        ("The Bristal at Armonk", "North Castle", "EHP/ALR", 171, "V", 2014, 126, 171),
        ("Benchmark at Stamford", "Stamford", "AL/MC", 80, "I", None, None, None),
        ("Brighton Gardens of Stamford", "Stamford", "AL/MC", 90, "I", None, None, None),
        ("Atria Stamford (AL share)", "Stamford", "AL", 60, "I", None, None, None),
        ("Waterstone at High Ridge (AL share)", "Stamford", "AL", 40, "I", None, None, None),
    ],
    il_supply=[
        ("The Osborn (IL, CCRC)", "Rye", 300, "I"),
        ("Broadview at Purchase College (LCS, CCRC)", "Purchase", 220, "V"),
        ("Waterstone at High Ridge (IL)", "Stamford", 80, "I"),
        ("Edgehill (CCRC)", "Stamford", 150, "I"),
        ("Atria Stamford (IL)", "Stamford", 80, "I"),
    ],
    pipeline=[
        ("Erickson senior PUD, Rye Brook", "CCRC (IL-led)", 834, "Application under review; positive declaration under SEQRA Aug 2026", "contingent", None, "https://ryebrookny.gov/900-king-street"),
        ("Greenwich Woods (8-30g)", "Assisted housing", 170, "Approved Nov 2025 (replaces a nursing home)", "counted", (41.03, -73.63), "https://patch.com/connecticut/greenwich/plan-demolish-nursing-home-170-unit-assisted-housing-development-okd-greenwich"),
        ("900 King Street (this site)", "IL/AL + townhomes", 211, "Rezoned and site plan approved: 126 IL / 85 AL / 20 townhomes; Sunrise is contract vendee", "subject", (41.03312, -73.67591), "https://ryebrookny.gov/900-king-street"),
    ],
    local_comps=[
        ("The Ambassador at Scarsdale", "Scarsdale", 9800, "Class A; another listing shows $11,525"),
        ("Waterstone at High Ridge", "Stamford", 9950, "Class A, IL/AL"),
        ("Benchmark at Mount Pleasant", "Thornwood", 9810, "Class A, opened Nov 2025"),
        ("Monarch Coopers Corner", "New Rochelle", 8900, "Class A, opened 2023"),
        ("Brightview Harrison", "Harrison", 7590, "Class A, opened Nov 2024"),
        ("Benchmark at Stamford", "Stamford", 7225, ""),
        ("High Point at Broadview", "Purchase", 6847, "On an LCS CCRC campus"),
        ("The Bristal at White Plains", "White Plains", 6200, "Starting price"),
        ("The Bristal at Armonk", "Armonk", 5800, "Starting price"),
        ("The Kensington", "White Plains", 4400, "Starting price"),
    ],
    local_comps_src=[("Caring.com Rye Brook, White Plains, Stamford and Greenwich listings (listed prices, Nov 2026; not a rate shop)", "https://www.caring.com/senior-living/assisted-living/new-york/rye-brook")],
    rent_key="NY-01",
    product="campus",
)

# Calibration: for Florham Park the town method (county 75+ share x town population) gives 19,214 people 75+
# against 28,680 from tract-level ACS inside 7 miles. County shares understate affluent suburbs (Essex's 5.7%
# includes Newark). The base case scales the town method by the same ratio; the low case leaves it unscaled.
CAL = 28680 / 19214

ORDER = ["NJ-04", "NJ-10", "NY-03", "CT-02", "NY-01"]


def build():
    site_data = json.load(open(os.path.join(ROOT, "data/site-data.json")))
    ev = json.load(open(os.path.join(ROOT, "data/lp-evidence.json")))
    out = {"as_of": AS_OF, "order": ORDER, "method": {
        "hh_per_75": HH_PER_75, "need": NEED, "need_hi": NEED_HI, "pma_share": PMA_SHARE,
        "il_propensity": IL_PROPENSITY, "il_propensity_hi": IL_PROPENSITY_HI, "il_pma_share": IL_PMA_SHARE, "sigma": SIGMA, "cal": round(CAL, 3),
        "county75": {k: round(v, 4) for k, v in COUNTY75.items()},
    }, "studies": {}}
    for sid in ORDER:
        st = STUDIES[sid]
        s = next(x for x in site_data["sites"] if x["id"] == sid)
        units = {l["care"]: l["units"] for l in s["uw"]["lines"]}
        almc_units = units.get("AL", 0) + units.get("MC", 0)
        il_units = units.get("IL", 0)
        towns, pop, p75, wmed_num, wmed_den = [], 0, 0, 0, 0
        for name, county, tp, frac, zips in st["towns"]:
            tpop = tp * frac
            t75 = tpop * COUNTY75[county]
            med = zipmed(zips)
            towns.append({"name": name, "county": county, "pop": round(tpop), "pop75": round(t75), "med65": med, "zips": zips, "frac": frac})
            pop += tpop; p75 += t75
            if med:
                wmed_num += med * t75; wmed_den += t75
        wmed = wmed_num / wmed_den
        share75 = share_above(wmed, 75000)
        share100 = share_above(wmed, 100000)
        share150 = share_above(wmed, 150000)
        # Florham Park: tract-level ACS is the primary figure; the town method is shown as a cross-check
        tract = st.get("tract")
        pop75 = tract["pop75"] if tract else p75 * CAL
        s75 = tract["share75k"] if tract else share75
        hh = pop75 * HH_PER_75
        q75 = hh * s75
        q100 = hh * share100
        q75_low = p75 * HH_PER_75 * share75
        existing = sum(r[3] for r in st["supply"])
        counted = 0
        for p in st["pipeline"]:
            if p[4] == "counted":
                counted += p[2]
            elif p[4] == "counted_part":
                counted += st.get("cedar_grove_almc", 0)
        contingent = sum(p[2] for p in st["pipeline"] if p[4] == "contingent" and "AL" in p[1])
        def run(need, extra=0, q=None):
            q = q75 if q is None else q
            demand = q * need / PMA_SHARE
            unmet = demand - existing - counted - extra
            return {"demand": round(demand), "unmet": round(unmet), "capture": (almc_units / unmet) if unmet > 0 else None}
        grid = {f"{n:.2f}": {"base": run(n), "contingent": run(n, contingent) if contingent else None} for n in (0.08, 0.10, 0.12, 0.14)}
        # NY occupancy from DOH census
        occ = None
        doh = [r for r in st["supply"] if len(r) > 6 and r[6] is not None]
        if doh:
            occ = sum(r[6] for r in doh) / sum(r[7] for r in doh)
        il = None
        if il_units:
            il_sup = sum(r[2] for r in st.get("il_supply", []))
            il_pipe = sum(p[2] for p in st["pipeline"] if p[4] == "contingent" and "CCRC" in p[1])
            def ilrun(prop, extra=0):
                d = q100 * prop / IL_PMA_SHARE
                un = d - il_sup - extra
                return {"demand": round(d), "unmet": round(un), "capture": (il_units / un) if un > 0 else None}
            il = {"units": il_units, "q100": round(q100), "supply": il_sup, "pipeline": il_pipe,
                  "base": ilrun(IL_PROPENSITY), "hi": ilrun(IL_PROPENSITY_HI), "with_pipeline": ilrun(IL_PROPENSITY_HI, il_pipe) if il_pipe else None}
        pipe_rows = [{"name": p[0], "type": p[1], "units": p[2], "status": p[3], "treat": p[4], "miles": round(hav(st["site"], p[5]), 1) if p[5] else None, "src": p[6]} for p in st["pipeline"]]
        rents = ev["rents"].get(st["rent_key"]) or {}
        out["studies"][sid] = {
            "id": sid, "pma_label": st["pma_label"], "pma_why": st["pma_why"],
            "towns": towns, "pma_pop": round(pop), "pma_pop75_town": round(p75), "med65_weighted": round(wmed),
            "tract": tract, "pop75": round(pop75), "share75k": round(s75, 3), "share75k_town": round(share75, 3),
            "share100k": round(share100, 3), "share150k": round(share150, 3),
            "hh75": round(hh), "q75": round(q75), "q100": round(q100),
            "almc_units": almc_units, "il_units": il_units,
            "supply": [{"name": r[0], "town": r[1], "type": r[2], "units": r[3], "basis": r[4], "opened": r[5],
                        **({"census": r[6], "beds": r[7]} if len(r) > 6 else {})} for r in st["supply"]],
            "supply_src": st["supply_src"], "supply_src_url": st.get("supply_src_url"),
            "excluded": st.get("excluded", []), "il_supply": [{"name": r[0], "town": r[1], "units": r[2], "basis": r[3]} for r in st.get("il_supply", [])],
            "existing": existing, "pipeline_counted": counted, "contingent": contingent, "pipeline": pipe_rows,
            "base": run(NEED), "hi": run(NEED_HI), "low": run(NEED, q=q75_low), "low_hi": run(NEED_HI, q=q75_low), "q75_low": round(q75_low), "with_contingent": run(NEED, contingent) if contingent else None,
            "grid": grid,
            "penetration": (existing + counted + almc_units) / q75, "penetration_now": (existing + counted) / q75,
            "occupancy_doh": occ, "il": il,
            "local_comps": st.get("local_comps"), "local_comps_src": st.get("local_comps_src"),
            "rent_model": rents.get("model"), "product": st["product"],
        }
    path = os.path.join(ROOT, "data/market-studies.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=1)
    for sid in ORDER:
        x = out["studies"][sid]
        b = x["base"]; h = x["hi"]; c = x["with_contingent"]
        print(sid, "LOW cap", x["low"]["capture"] and round(x["low"]["capture"],2), "unmet", x["low"]["unmet"], "|", "pop", x["pma_pop"], "75+", x["pop75"], "(town", x["pma_pop75_town"], ") med65", x["med65_weighted"], "s75", x["share75k"], "(town", x["share75k_town"], ")",
              "q75", x["q75"], "sup", x["existing"], "+", x["pipeline_counted"], "dem", b["demand"], "unmet", b["unmet"],
              "cap", b["capture"] and round(b["capture"], 2), "hi", h["capture"] and round(h["capture"], 2),
              "cont", c and c["capture"] and round(c["capture"], 2), "pen", round(x["penetration"], 3), "occ", x["occupancy_doh"] and round(x["occupancy_doh"], 3), "il", x["il"])

if __name__ == "__main__":
    build()
