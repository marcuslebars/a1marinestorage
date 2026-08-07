// A1 Marine Storage — locality config (single source of truth for the
// /boat-storage/[locality] local-SEO pages). Lives in shared/ so the Express
// server can inject each town's meta + JSON-LD into the initial HTML (which is
// what makes these pages rank) and the client can render them from the same data.
//
// Adding a town later = adding one entry here. Intros are written per-town (real
// waters + boating character, no invented business names) — thin doorway pages
// get filtered by Google, so each is genuinely distinct. driveMin values are
// approximate tow times from the yard at 639 Concession Road 16 East, Tiny, ON.

export interface Locality {
  slug: string;
  name: string;
  /** Approx. minutes to tow from the yard (639 Concession Rd 16 E, Tiny). */
  driveMin: number;
  /** Short water-body phrase for headings / meta. */
  waters: string;
  /** Unique 150–250 word body copy. */
  intro: string;
}

export const LOCALITIES: Locality[] = [
  {
    slug: "midland",
    name: "Midland",
    driveMin: 15,
    waters: "Georgian Bay and the 30,000 Islands",
    intro:
      "Midland sits at the head of Midland Bay, the main jumping-off point for Georgian Bay's 30,000 Islands and Beausoleil Island. Boaters here run everything from bowriders headed to Little Lake for an afternoon to cruisers and sailboats provisioning at the town dock before a week among the islands. It's a working harbour town with a real boating culture — and a place where a hard winter does real damage to a boat left uncovered. Our storage yard at 639 Concession Road 16 East is about 15 minutes from the Midland waterfront, so hauling out at the end of the season is a short tow, not an ordeal. We block your boat properly on its trailer, wrap it tight against the snow that rolls in off the bay, and winterize the engine so nothing cracks over the freeze. Come spring we can commission it and have you back on the water for the first warm weekend. Whether you keep your boat at a Midland marina or launch from the town ramp, storing it here means one local team handling haul-out, wrap, winterizing, and launch — with no scramble for space when the docks come out.",
  },
  {
    slug: "penetanguishene",
    name: "Penetanguishene",
    driveMin: 18,
    waters: "the sheltered waters of Penetang Bay",
    intro:
      "Penetanguishene wraps around one of the most sheltered natural harbours on Georgian Bay — a long, deep bay that's been a haven for boats since the days of the naval base at Discovery Harbour. That protection makes \"Penetang\" a favourite for sailboats and larger cruisers that want calm water to come home to, and the town docks and launch stay busy from the May long weekend through Thanksgiving. But protected summer water doesn't help a boat in February. Our yard in Tiny is roughly 15 to 20 minutes from the Penetanguishene waterfront, close enough that end-of-season haul-out is simple. We position and block your boat on its trailer, install a vented, framed shrink wrap that sheds snow instead of trapping it, and run a full winterization so the engine, outdrive, and plumbing come through the cold intact. In spring we reverse it all and get you launch-ready. For Penetang owners who've been leaving a boat under a tarp in the driveway — or paying premium marina rates to store on the water — a secure, monitored winter home a few minutes down the road is the easier, safer option.",
  },
  {
    slug: "tiny",
    name: "Tiny",
    driveMin: 5,
    waters: "Tiny Township's Georgian Bay shoreline",
    intro:
      "Tiny Township is home — our yard at 639 Concession Road 16 East is right here, minutes from the long stretch of Georgian Bay shoreline that runs from Thunder Beach and the Tiny Beaches down through Woodland and Balm Beach. Boating in Tiny is mostly cottage and day boating: runabouts and pontoons launched from the beach communities and public ramps for a day on the bay, plus the sailboats and cruisers kept nearby in Midland and Penetang. The flip side of that gorgeous open shoreline is weather — Tiny takes the full force of the snow and wind that comes across Georgian Bay all winter, and a boat left out in it pays the price. Storing with us means your boat never leaves the township: a short tow to a secured, fenced lot where it's blocked on its trailer, wrapped tight, winterized, and watched over until spring. Because we're local, we know exactly what a Tiny winter does to a boat, and we build the wrap and winterizing around it. For Tiny residents and cottagers, it's the most convenient storage on the shore — no highway tow, and no leaving your boat exposed on the property all season.",
  },
  {
    slug: "wasaga-beach",
    name: "Wasaga Beach",
    driveMin: 32,
    waters: "Nottawasaga Bay and the Nottawasaga River",
    intro:
      "Wasaga Beach lines the sandy crescent of Nottawasaga Bay, with the Nottawasaga River winding behind it — a combination that gives local boaters both a protected river to launch on and the open water of southern Georgian Bay to run. It's a busy, seasonal boating town: powerboats, wakeboats, and pontoons that come alive in July and get pulled the moment the water cools. That short, intense season makes proper winter storage easy to put off, right up until the first hard freeze splits a hose. Our yard is about 30 minutes from Wasaga, an easy tow along the county roads, and it solves the problem Wasaga boaters know well: nowhere secure to keep a boat over the long off-season. We haul out, block your boat on its trailer, wrap it against snow and ice, and winterize the engine and systems so the spring launch is a formality, not a repair bill. If you've been overwintering a boat in a Wasaga backyard or paying to shuffle it between seasonal lots, a fenced, monitored yard with wrap and winterizing under one roof is a cleaner, safer answer.",
  },
  {
    slug: "victoria-harbour",
    name: "Victoria Harbour",
    driveMin: 22,
    waters: "Hog Bay and Severn Sound",
    intro:
      "Victoria Harbour sits on Hog Bay at the eastern end of Severn Sound, sheltered water that opens into Georgian Bay one way and the Trent-Severn Waterway the other. It's a quieter, cottage-and-cruiser kind of place — boats that spend summer weekends exploring the sound, running out to the islands, or locking through toward the Trent system. The sheltered harbour is kind to boats in summer; the winter that follows is not. Our storage yard in Tiny is about 20 to 25 minutes from Victoria Harbour, a straightforward tow along the north Simcoe roads. We take your boat off the water for the season, block it on its trailer, wrap it in vented heat-shrink that carries a snow load without collapsing, and winterize the engine and plumbing against the freeze. Come spring we de-winterize, check everything over, and hand it back launch-ready. For Victoria Harbour owners, storing a few minutes inland means a secure, monitored lot instead of a tarp in the yard — and one local crew looking after haul-out, wrapping, and winterizing from last cruise to first launch.",
  },
  {
    slug: "port-mcnicoll",
    name: "Port McNicoll",
    driveMin: 20,
    waters: "Hog Bay and Severn Sound",
    intro:
      "Port McNicoll was built as a deep-water railway and grain-shipping port on Hog Bay, and that deep, sheltered harbour is still its calling card for boaters today. It's a quiet residential community on Severn Sound with easy access to Georgian Bay and the Trent-Severn Waterway — the kind of place where boats are a fixture of summer and then vanish, ideally into proper storage, when the season ends. Our yard at 639 Concession Road 16 East in Tiny is roughly 20 minutes from Port McNicoll, close enough that pulling the boat for winter is a quick job. We block it on its trailer on a secured, fenced lot, install a framed, vented shrink wrap that sheds Georgian Bay snow, and run a complete winterization so the engine, outdrive, and lines don't freeze. In spring we commission it and you're back on the sound. For Port McNicoll boat owners, it beats leaving a boat exposed through a Severn Sound winter or hunting for storage space each fall — one nearby team handles the whole off-season, start to finish.",
  },
  {
    slug: "honey-harbour",
    name: "Honey Harbour",
    driveMin: 38,
    waters: "the 30,000 Islands and Georgian Bay Islands National Park",
    intro:
      "Honey Harbour is the gateway to the 30,000 Islands and Georgian Bay Islands National Park — cottage country where many properties are water-access only and a boat isn't a toy, it's the family car. Runabouts, pontoons, and cruisers here spend the summer threading the granite-and-pine channels out to Beausoleil and beyond. When the cottages close up for winter, those boats need somewhere secure on the mainland, and that's a real problem in a place with more islands than parking. Our yard in Tiny is about 35 to 40 minutes from Honey Harbour, an easy haul once the boat's on the trailer. We store it on a fenced, monitored lot, block it properly, wrap it tight against heavy Georgian Bay snow, and winterize every system so nothing splits over the freeze. In spring we get it launch-ready for the run back out to the island. For Honey Harbour cottagers who've been leaving a boat shrink-wrapped in a marina lot or a friend's field, a dedicated storage yard with wrapping and winterizing in one place — a short tow from the harbour — takes the worry out of the off-season.",
  },
  {
    slug: "lafontaine",
    name: "Lafontaine",
    driveMin: 8,
    waters: "Georgian Bay at Thunder Beach and Tiny's north shore",
    intro:
      "Lafontaine is a Tiny Township community with deep French-Canadian roots, tucked behind the Georgian Bay shoreline near Thunder Beach and the Tiny Beaches. Boating here is classic cottage-country day boating — small runabouts, fishing boats, and pontoons launched for an afternoon on the bay, plus the boats cottagers keep close to the north-shore beaches. Because Lafontaine is right in our backyard — the yard at 639 Concession Road 16 East is only about 8 to 10 minutes away — it's about the most convenient winter storage a Lafontaine boat owner can find. There's no highway tow and no reason to leave a boat sitting out through a Georgian Bay winter, exposed to the snow and wind that hammer Tiny's shore. We block your boat on its trailer on a secured lot, wrap it in vented heat-shrink, and winterize the engine and systems so it's protected until spring, then commission it when you're ready to launch. For Lafontaine and the surrounding Tiny beach communities, storing with a local crew a few concessions over is the simplest way to put the boat away right and get it back out fast.",
  },
  {
    slug: "balm-beach",
    name: "Balm Beach",
    driveMin: 10,
    waters: "Georgian Bay at Balm Beach",
    intro:
      "Balm Beach is one of Tiny Township's best-known stretches of Georgian Bay shoreline — a sandy, family beach community where summer means small craft off the shore: runabouts, personal watercraft, fishing boats, and pontoons that spend the season close to home. It's day-boating country, right on the open bay, which is exactly why winter is hard on the boats kept here; there's no natural harbour to duck into, just the full sweep of Georgian Bay weather. Our storage yard is about 10 minutes inland from Balm Beach, so getting your boat to safe winter storage is quick and easy. We haul it out, block it on its trailer on a fenced, monitored lot, install a snow-shedding shrink wrap, and run a full winterization so a hard freeze can't crack a block or split a line. In spring we reverse it and you're back on the water for the first warm day. For Balm Beach boat owners and cottagers, a secure local yard a few minutes away beats a tarp in the yard or a winter of worry about a boat sitting out on an exposed shore.",
  },
  {
    slug: "waubaushene",
    name: "Waubaushene",
    driveMin: 28,
    waters: "Matchedash Bay and the Trent-Severn gateway",
    intro:
      "Waubaushene sits where Severn Sound meets Matchedash Bay at the very top of the Trent-Severn Waterway — the last stop on Georgian Bay before boats lock into the canal system that runs down to Lake Ontario. That makes it a crossroads for boaters: some running out to the open bay and the islands, others provisioning before a long cruise down the Trent. It's quieter and more sheltered than the open shore, but the winters are just as cold, and a boat that's cruised the waterway all summer still needs to come out of the water and be protected. Our yard in Tiny is about 25 to 30 minutes from Waubaushene along the highway and the north Simcoe roads. We block your boat on its trailer, wrap it against the snow, and winterize the engine and systems so it's ready to lock through again next spring. For Waubaushene and the surrounding Severn Sound communities, storing with one local crew — haul-out, wrap, winterize, launch — is far simpler than juggling seasonal spots or leaving a boat exposed over the off-season.",
  },
  {
    slug: "coldwater",
    name: "Coldwater",
    driveMin: 30,
    waters: "the Coldwater River and the Trent-Severn at Matchedash",
    intro:
      "Coldwater is an inland village on the river that shares its name, a short run from where the Trent-Severn Waterway threads through Matchedash Bay toward Georgian Bay. Boating around Coldwater leans toward smaller craft — fishing boats, runabouts, and paddlecraft on the river — along with trailer boats that launch onto the waterway and the sound for bigger days out. It's not a big-marina town, which is exactly why winter storage can be a headache: plenty of boats, not much secure space to keep them once the season ends. Our yard at 639 Concession Road 16 East in Tiny is about 30 minutes from Coldwater, an easy tow up the highway. We take the boat for the winter, block it on its trailer on a fenced, monitored lot, wrap it in vented heat-shrink, and winterize it against the freeze so nothing's damaged over the cold months. Come spring we commission it and you're back on the river or the waterway. For Coldwater boat owners, a secure, all-in-one storage yard a half-hour away is a lot better than a boat sitting out behind the house all winter.",
  },
  {
    slug: "orillia",
    name: "Orillia",
    driveMin: 45,
    waters: "Lake Couchiching and Lake Simcoe at the Narrows",
    intro:
      "Orillia sits between Lake Couchiching and Lake Simcoe at the Narrows, right on the Trent-Severn Waterway — a genuine boating city with the Port of Orillia marina downtown and a summer full of cruisers, houseboats, and runabouts working the two big lakes and the canal. It's a different watershed from our home waters on Georgian Bay, but plenty of Orillia-area owners trailer their boats and want them stored somewhere secure, capable, and priced right for the winter. Our yard in Tiny is about 45 minutes from Orillia, a straightforward tow along Highway 12. We handle the full off-season the same way we do for our Georgian Bay boats: haul-out, proper blocking on your trailer, a framed and vented shrink wrap that sheds snow, and a complete winterization of the engine and systems. In spring we de-winterize and commission it so you're ready for the Simcoe–Couchiching season. If you're an Orillia boater who'd rather hand the whole winter job — wrap, winterize, secure storage — to one experienced crew than piece it together locally, we're an easy tow away and set up to do exactly that.",
  },
  {
    slug: "barrie",
    name: "Barrie",
    driveMin: 52,
    waters: "Kempenfelt Bay on Lake Simcoe",
    intro:
      "Barrie curves around Kempenfelt Bay, the long deep arm of Lake Simcoe that gives the city one of the busiest recreational boating scenes in central Ontario — wakeboats, cruisers, sailboats, and runabouts out of the city marina and the launches along the waterfront all summer long. Like Orillia, it's Lake Simcoe water rather than our home Georgian Bay, but the winter storage problem is identical: a short, intense season, a lot of boats, and the annual scramble to find somewhere secure to put them when the lake ices over. Our yard in Tiny is about 50 minutes from Barrie up Highway 400 — a longer tow, but worth it for owners who want their boat wrapped, winterized, and stored properly by one crew instead of split across services. We block your boat on its trailer on a fenced, monitored lot, install a snow-shedding vented wrap, and winterize every system so a Simcoe deep-freeze can't do damage. In spring we commission it for launch. For Barrie boaters willing to trailer a little farther for full-service winter care at a straightforward per-foot price, we're set up to take the whole job off your hands.",
  },
];

export const LOCALITY_SLUGS = LOCALITIES.map((l) => l.slug);

export function findLocality(slug: string): Locality | undefined {
  return LOCALITIES.find((l) => l.slug === slug);
}

/** Per-town FAQ (feeds the page + its FAQPage JSON-LD). Town-specific + genuinely
 *  distinct per locality (driveMin / name / waters differ). */
export function localityFaq(loc: Locality): { q: string; a: string }[] {
  return [
    {
      q: `How far is A1 Marine Storage from ${loc.name}?`,
      a: `Our yard at 639 Concession Road 16 East in Tiny, Ontario is about ${loc.driveMin} minutes from ${loc.name} — an easy tow at fall haul-out and again in spring.`,
    },
    {
      q: `Do you store and shrink wrap boats from ${loc.name}?`,
      a: `Yes. We store, shrink wrap, and winterize boats for owners across ${loc.name} and ${loc.waters} on our secure, fenced, monitored lot.`,
    },
    {
      q: `What does winter boat storage for a ${loc.name} boat cost?`,
      a: `Outdoor storage and shrink wrapping are priced per foot (with a minimum) and winterization is a flat rate by engine type — bundle to save. Use our calculator for an instant quote.`,
    },
    {
      q: `Can I get my boat back for spring launch?`,
      a: `Absolutely. We arrange spring pickup and can de-winterize and commission your boat so it's launch-ready when the ${loc.name} season opens up.`,
    },
  ];
}
