/**
 * Supplement Evidence Database
 *
 * Evidence grades (conform ISSN Position Stands 2021, Cochrane Reviews, EFSA):
 *   A — Strong, consistent evidence from multiple RCTs; effective & safe at noted dose
 *   B — Good evidence from ≥2 RCTs; likely effective; minor caveats
 *   C — Limited/mixed evidence; may work but more research needed
 *   D — Insufficient evidence or evidence of ineffectiveness / safety concerns
 *
 * Specifically curated for strength / hypertrophy training.
 */

export type EvidenceGrade = 'A' | 'B' | 'C' | 'D';

export interface KeyStudy {
  authors: string;
  year: number;
  title: string;
}

export interface SupplementEvidence {
  /** ISSN-style letter grade for strength / hypertrophy context */
  grade: EvidenceGrade;
  /** Human-readable one-line summary of what the grade means for this supplement */
  gradeLabel: string;
  /** Scientifically established optimal dose (display string, e.g. "3–5 g/day") */
  optimalDose: string;
  /** Best time(s) to take — maps to Supplement timing options where possible */
  optimalTiming: string;
  /** 2–4 key benefits confirmed by evidence */
  benefits: string[];
  /** Safety notes / contra-indications / interactions */
  warnings: string[];
  /** Up to 3 pivotal studies */
  keyStudies: KeyStudy[];
  /** Short free-text footnote */
  notes: string;
}

// ---------------------------------------------------------------------------
// MAIN DATABASE
// ---------------------------------------------------------------------------

const SUPPLEMENT_SCIENCE_DB: Record<string, SupplementEvidence> = {
  creatine: {
    grade: 'A',
    gradeLabel: 'Sterk bewijs — een van de best onderzochte supplementen',
    optimalDose: '3–5 g/dag (onderhoud); 20 g/dag in 4 doses gedurende 5–7 dagen (laadfase optioneel)',
    optimalTiming: 'Post-workout of elke dag op een vast tijdstip (timing weinig relevant)',
    benefits: [
      'Vergroot fosfocreatine-voorraad → meer ATP bij korte explosieve inspanningen',
      'Verhoogt kracht en vermogen met 5–15% op 1RM',
      'Bevordert spiermassa-opbouw via cel-volumisatie en verhoogde trainingsprestaties',
      'Mogelijk neuroprotectief en cognitief ondersteunend',
    ],
    warnings: [
      'Veilig bij gezonde personen; nierfunctie normaal niet aangetast',
      'Lichte vochtretentie in de eerste weken mogelijk',
      'Overleg bij bestaande nierproblematiek',
    ],
    keyStudies: [
      { authors: 'Lanhers et al.', year: 2017, title: 'Creatine supplementation and lower limb strength: a systematic review & meta-analysis. Eur J Sport Sci.' },
      { authors: 'Rawson & Volek', year: 2003, title: 'Effects of creatine supplementation and resistance training on muscle strength and weightlifting performance. J Strength Cond Res.' },
      { authors: 'Kreider et al. (ISSN)', year: 2017, title: 'International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation. J Int Soc Sports Nutr.' },
    ],
    notes: 'Creatinemonohydraat is de goedkoopste en meest effectieve vorm. Duurdere varianten (HCl, ethylester) bieden geen bewezen voordeel.',
  },

  caffeine: {
    grade: 'A',
    gradeLabel: 'Sterk bewijs — breed inzetbaar ergogeen middel',
    optimalDose: '3–6 mg/kg lichaamsgewicht (~200–400 mg voor meeste volwassenen), 45–60 min voor training',
    optimalTiming: 'Pre-workout (45–60 min voor sessie)',
    benefits: [
      'Verhoogt uithoudingsvermogen, kracht en power significant',
      'Verlaagt RPE (waargenomen inspanning) bij dezelfde belasting',
      'Verbetert focus en reactietijd',
      'Versnelt vetoxidatie als energiebron',
    ],
    warnings: [
      'Dagelijks gebruik veroorzaakt tolerantievorming — cyclen of 1–2 cafeïnevrije dagen/week',
      'Boven 6 mg/kg: hartkloppingen, angst, slaapproblemen',
      'Halveer de dosis bij gevoeligheid of bij inname na 14:00',
      'Combineer niet met andere stimulantia',
    ],
    keyStudies: [
      { authors: 'Grgic et al.', year: 2019, title: 'Wake up and smell the coffee: caffeine supplementation and exercise performance — an umbrella review. Br J Sports Med.' },
      { authors: 'Goldstein et al. (ISSN)', year: 2010, title: 'International Society of Sports Nutrition position stand: caffeine and performance. J Int Soc Sports Nutr.' },
      { authors: 'Pickering & Grgic', year: 2019, title: 'Caffeine and exercise: what next? Sports Med.' },
    ],
    notes: 'Cafeïne-anhydraat (pil/poeder) geeft consistentere dosering dan koffie. Slaapkwaliteit wint het van timing-voordeel: gebruik na 14:00 af.',
  },

  'whey protein': {
    grade: 'A',
    gradeLabel: 'Sterk bewijs — effectief als dagelijkse eiwitinname onvoldoende is',
    optimalDose: '20–40 g per moment; totaal eiwitdoel: 1,6–2,2 g/kg/dag',
    optimalTiming: 'Post-workout of als aanvulling op dagelijkse eiwitinname (timing minder kritiek dan totaal)',
    benefits: [
      'Hoogste leucine-gehalte van alle eiwitbronnen → optimale MPS-stimulatie',
      'Snel verteerbaar: piekresponse eiwitaanmaak in ~90 min',
      'Vergemakkelijkt dagelijks eiwitdoel halen',
      'Ondersteunt herstel en spiermassa-behoud bij energietekort',
    ],
    warnings: [
      'Niet nodig als totale voeding voldoende eiwit levert (~1,6–2,2 g/kg)',
      'Kan maag-darmklachten geven bij lactose-intolerantie (kies isolaat)',
      'Geen voordeel boven andere volledige eiwitbronnen bij vergelijkbare leucine-inname',
    ],
    keyStudies: [
      { authors: 'Morton et al.', year: 2018, title: 'A systematic review, meta-analysis, and meta-regression of the effect of protein supplementation on resistance training–induced gains in muscle mass and strength. Br J Sports Med.' },
      { authors: 'Stokes et al.', year: 2018, title: 'Recent perspectives regarding the role of dietary protein for the promotion of muscle hypertrophy. Nutrients.' },
      { authors: 'Witard et al.', year: 2014, title: 'Myofibrillar muscle protein synthesis rates subsequent to a meal in response to small and large bolus doses of dairy and soy protein. Am J Clin Nutr.' },
    ],
    notes: 'Wheyconcentraat, -isolaat en -hydrolysaat zijn alle effectief. Kies isolaat bij lactose-gevoeligheid; hydrolysaat biedt geen bewezen voordeel voor gezonde sporters.',
  },

  'beta-alanine': {
    grade: 'B',
    gradeLabel: 'Goed bewijs — effectief bij inspanning van 1–4 minuten',
    optimalDose: '3,2–6,4 g/dag (opgebouwd over 4 weken voor optimale carnosine-verzadiging)',
    optimalTiming: 'Verdeel over de dag (2–4 doses) om tintelingen te minimaliseren; niet per se pre-workout',
    benefits: [
      'Verhoogt intramusculair carnosine → buffert melkzuur (H⁺)',
      'Verbetert prestaties bij inspanning van 1–4 minuten (HIIT, boksronde, zwemwedstrijd)',
      'Uitstel van vermoeidheid bij hoog-intense herhalingsinspanning',
    ],
    warnings: [
      'Paresthesie (tintelingen/jeuk) is onschadelijk maar lastig; los op met kleinere doses (≤1,6 g/moment)',
      'Beperkt effect bij pure krachtsport (sets < 60 s); meer relevant bij hoog-volume training',
      'Effect verschijnt pas na 4+ weken consistent gebruik',
    ],
    keyStudies: [
      { authors: 'Hobson et al.', year: 2012, title: 'Beta-alanine supplementation to improve exercise capacity and performance: a systematic review and meta-analysis. Amino Acids.' },
      { authors: 'Trexler et al. (ISSN)', year: 2015, title: 'International Society of Sports Nutrition position stand: beta-alanine. J Int Soc Sports Nutr.' },
    ],
    notes: 'Meest relevant bij hoog-volume krachtsport of cardio-componenten. Minder relevant bij puur laag-rep krachttraining.',
  },

  'vitamin d': {
    grade: 'B',
    gradeLabel: 'Goed bewijs — corrigeert deficiëntie; optimale spierfunctie',
    optimalDose: '1000–4000 IU/dag (afhankelijk van startwaarde; bloedtest aanbevolen)',
    optimalTiming: 'Bij een vetrijke maaltijd (vetoplosbaar)',
    benefits: [
      'Essentieel voor calciumopname en botdichtheid',
      'Ondersteunt spierkrachtontwikkeling en -functie (VDR in spiercellen)',
      'Immuunmodulatie en ontstekingsremming',
      'Verlaagt risico op stressfracturen',
    ],
    warnings: [
      'Boven 4000 IU/dag zonder bloedtest niet aanbevolen (risico toxiciteit bij langdurig gebruik > 10.000 IU)',
      'Supplementeer vitamine K2 (MK-7) bij hoge doses D3 voor calciumgeleiding',
      'Laat serum 25(OH)D meten voor optimale dosering',
    ],
    keyStudies: [
      { authors: 'Tomlinson et al.', year: 2015, title: 'Dietary supplementation with vitamin D and the impact on muscle strength and power. Proc Nutr Soc.' },
      { authors: 'Close et al.', year: 2013, title: 'Assessment of vitamin D concentration in non-supplemented professional athletes and healthy adults. J Sports Sci.' },
    ],
    notes: 'Streef naar 25(OH)D-serum van 50–75 nmol/L. Bewolkt klimaat, weinig buiten of donkere huidskleur verhogen kans op tekort aanzienlijk.',
  },

  'omega-3': {
    grade: 'B',
    gradeLabel: 'Goed bewijs — herstelondersteuning en ontstekingsremming',
    optimalDose: '1–3 g EPA+DHA per dag (gecombineerde waarde, niet de totale visoliecapsulewaarde)',
    optimalTiming: 'Bij een maaltijd (vermindert oprispingen; vetoplosbaar)',
    benefits: [
      'Verlaagt spierpijn na training (DOMS) en systemische ontstekingsmarkers',
      'Ondersteunt spiereitwitsynthese bij ouderen (anti-katabool)',
      'Hart- en vaatbeschermend bij intensieve training',
      'Verbetert insulinegevoeligheid',
    ],
    warnings: [
      'Boven 3 g/dag: lichte bloedverdunning; overleg bij antistolling',
      'Peroxidatie bij lage kwaliteit producten — kies gecertificeerde merken (IFOS)',
      'Bewaar gekoeld; niet meenemen in hete auto',
    ],
    keyStudies: [
      { authors: 'Smith et al.', year: 2011, title: 'Omega-3 polyunsaturated fatty acids augment the muscle protein anabolic response to hyperaminoacidemia-hyperinsulinemia in healthy young and middle-aged men and women. Clin Sci.' },
      { authors: 'Calder', year: 2013, title: 'Omega-3 polyunsaturated fatty acids and inflammatory processes. Biomed Res Int.' },
    ],
    notes: 'Vette vis (zalm, haring, makreel) 2–3×/week is equivalent. Algenolie is een veganistische alternatief met vergelijkbare EPA/DHA-levering.',
  },

  magnesium: {
    grade: 'B',
    gradeLabel: 'Goed bewijs — correct bij tekort; brede sportfysiologische rol',
    optimalDose: '300–400 mg/dag (elementair magnesium); verkies bisglycinaat of malaat voor opname',
    optimalTiming: 'Voor het slapen gaan (ontspannend effect; vermindert nachtelijke krampen)',
    benefits: [
      'Betrokken bij > 300 enzymreacties incl. ATP-productie en eiwitsynthese',
      'Verbetert slaapkwaliteit en -duur',
      'Vermindert spierkrampen bij zweet-verlies',
      'Ondersteunt testosteronproductie bij deficiëntie',
    ],
    warnings: [
      'Magnesiumoxide heeft slechte biobeschikbaarheid (<5%) — vermijd',
      'Hoge doses (> 600 mg) kunnen diarree veroorzaken',
      'Interactie mogelijk met antibiotica en bepaalde medicatie',
    ],
    keyStudies: [
      { authors: 'Cinar et al.', year: 2011, title: 'Effects of magnesium supplementation on testosterone levels of athletes and sedentary subjects at rest and after exhaustion. Biol Trace Elem Res.' },
      { authors: 'Nielsen & Lukaski', year: 2006, title: 'Update on the relationship between magnesium and exercise. Magnes Res.' },
    ],
    notes: 'Intensieve sporters verliezen meer magnesium via zweet. Bisglycinaat (chelaat) heeft betere tolerantie en opname dan anorganische zouten.',
  },

  'l-citrulline': {
    grade: 'B',
    gradeLabel: 'Goed bewijs — verbetert pomping, herstel en hoog-volume prestaties',
    optimalDose: '6–8 g L-citrulline (of 8–10 g citrulline-malaat 2:1) 60 min pre-workout',
    optimalTiming: 'Pre-workout (60 min voor training)',
    benefits: [
      'Verhoogt plasma-argininewaarden → meer NO-productie → betere doorbloeding',
      'Vermindert DOMS en vermoeidheid na intensieve training',
      'Verhoogt aantal herhalingen bij hoog-volume krachtsport',
      'Verlaagt systolische bloeddruk tijdens inspanning',
    ],
    warnings: [
      'Niet te verwarren met L-arginine: citrulline heeft hogere biologische beschikbaarheid',
      'Bij bloeddrukverlagende medicatie overleggen',
      'Citrulline-malaat bevat minder pure citrulline — controleer dosering op label',
    ],
    keyStudies: [
      { authors: 'Pérez-Guisado & Jakeman', year: 2010, title: 'Citrulline malate enhances athletic anaerobic performance and relieves muscle soreness. J Strength Cond Res.' },
      { authors: 'Sureda et al.', year: 2010, title: 'L-citrulline-malate influence over branched chain amino acid utilization during exercise. Eur J Appl Physiol.' },
    ],
    notes: 'Effectiever dan L-arginine door hogere darmopname. Citrulline-malaat-producten: controleer of citrulline ≥ 6 g per dosis is.',
  },

  ashwagandha: {
    grade: 'B',
    gradeLabel: 'Goed bewijs — cortisolverlaging, krachtstoename bij stress',
    optimalDose: '300–600 mg/dag KSM-66 of Sensoril extract (gestandaardiseerd op withanolides)',
    optimalTiming: 'Bij een maaltijd; avond of splitsing in 2 doses',
    benefits: [
      'Verlaagt cortisol significant bij chronische stress',
      'Verhoogt testosteron en LH bij mannen met suboptimale waarden',
      'Toename in kracht (bench, squat) en VO₂max in meerdere RCTs',
      'Verbetert slaapkwaliteit en herstel',
    ],
    warnings: [
      'Gebruik gestandaardiseerde extracten (KSM-66, Sensoril) — ruw poeder is minder consistent',
      'Niet aanbevolen bij zwangerschap of auto-immuunziekten',
      'Mogelijke interactie met schildklier- en corticosteroïde medicatie',
      'Effect bouwt op over 8–12 weken — geen snelwerkend middel',
    ],
    keyStudies: [
      { authors: 'Wankhede et al.', year: 2015, title: 'Examining the effect of Withania somnifera supplementation on muscle strength and recovery. J Int Soc Sports Nutr.' },
      { authors: 'Chandrasekhar et al.', year: 2012, title: 'A prospective, randomized double-blind, placebo-controlled study of safety and efficacy of a high-concentration full-spectrum extract of ashwagandha root. Indian J Psychol Med.' },
    ],
    notes: 'Meest onderzocht bij gestreste of slaapbeperkte sporters. Effect op toppresteerders zonder stresscomponent is minder uitgesproken.',
  },

  bcaa: {
    grade: 'C',
    gradeLabel: 'Beperkt bewijs — overbodig bij voldoende eiwitinname',
    optimalDose: '5–10 g rondom training (niet relevant als totale eiwitinname ≥ 1,6 g/kg/dag)',
    optimalTiming: 'Pre- of intra-workout',
    benefits: [
      'Leucine stimuleert mTOR/MPS-activatie',
      'Intra-workout inname kan DOMS mild verminderen',
    ],
    warnings: [
      'Bij voldoende totale eiwitinname geen extra voordeel t.o.v. volledig eiwit (whey, vlees, ei)',
      'Mist essentiële aminozuren → inferieur aan volledige eiwitbron voor MPS',
      'Duurder dan volledige eiwitbronnen bij vergelijkbare leucine-content',
    ],
    keyStudies: [
      { authors: 'Wolfe', year: 2017, title: 'Branched-chain amino acids and muscle protein synthesis in humans: myth or reality? J Int Soc Sports Nutr.' },
      { authors: 'Morton et al.', year: 2015, title: 'Nutritional interventions to augment resistance training-induced skeletal muscle hypertrophy. Front Physiol.' },
    ],
    notes: 'Zet dit budget liever in op voldoende totale eiwitinname. BCAAs zijn nuttig als je nuchter traint en geen compleet eiwit kunt innemen.',
  },

  zinc: {
    grade: 'C',
    gradeLabel: 'Beperkt bewijs — effectief bij tekort; weinig voordeel bij adequate inname',
    optimalDose: '15–30 mg/dag elementair zink (niet structureel > 40 mg — bovengrens EFSA)',
    optimalTiming: 'Voor het slapen gaan of bij maaltijd (nuchter kan misselijkheid geven)',
    benefits: [
      'Ondersteunt testosteron- en IGF-1-productie bij deficiëntie',
      'Betrokken bij immuunfunctie en eiwitaanmaak',
      'Vermindert trainings-gerelateerd oxidatief stress bij tekort',
    ],
    warnings: [
      'Chronisch gebruik > 40 mg/dag verstoort koperabsorptie',
      'ZMA-complexen (zink + magnesium + B6) ondanks marketing weinig extra bewijs vs. losse supplementen',
      'Oesters en rood vlees zijn uitstekende dieetbronnen',
    ],
    keyStudies: [
      { authors: 'Kilic et al.', year: 2010, title: 'The effect of exhaustion exercise on thyroid hormones and testosterone levels of elite athletes. Neuro Endocrinol Lett.' },
    ],
    notes: 'Test zinkstatus via bloedtest voor je supplementeert. Veganisten en vegetariërs lopen hoger risico op suboptimale inname door fytaatremming.',
  },

  hmb: {
    grade: 'C',
    gradeLabel: 'Gemengd bewijs — mogelijk nuttig voor beginners of bij calorierestrictie',
    optimalDose: '3 g/dag (verdeeld in 3 doses van 1 g)',
    optimalTiming: 'Verdeeld over de dag; één dosis pre-workout',
    benefits: [
      'Anti-katabole werking: remt spierafbraak',
      'Mogelijk effectief bij ongetrainden en bij energie-restrictie (cut)',
      'Verkort herstel bij overreaching',
    ],
    warnings: [
      'Bewijs bij getrainde sporters consistent zwak — weinig spiermasaktoename',
      'Vrije zuurvorm (HMB-FA) werkt sneller maar weinig praktisch voordeel bewezen',
      'Kostenbatenverhouding ongunstig vergeleken met creatine of whey',
    ],
    keyStudies: [
      { authors: 'Wilson et al.', year: 2014, title: 'The effects of 12 weeks of beta-hydroxy-beta-methylbutyrate free acid supplementation on muscle mass, strength and power. Eur J Appl Physiol.' },
      { authors: 'Rowlands & Thomson', year: 2009, title: 'Effects of beta-hydroxy-beta-methylbutyrate supplementation during resistance training on strength, body composition and muscle damage. Sports Med.' },
    ],
    notes: 'Prioriteit geven aan creatine, eiwit en cafeïne alvorens HMB toe te voegen. HMB heeft meest consistent bewijs bij oudere of ongetrainde personen.',
  },

  melatonin: {
    grade: 'A',
    gradeLabel: 'Sterk bewijs — slaapinductie en herstel (niet direct prestatiebevorderend)',
    optimalDose: '0,5–3 mg (laagste effectieve dosis); begin met 0,5 mg voor slaapkwaliteit',
    optimalTiming: 'Voor het slapen gaan (30–60 min voor slaap)',
    benefits: [
      'Versnelt inslapen en verbetert slaapkwaliteit',
      'Vermindert jet-lag effect bij ploegendienst of reizen',
      'Slaap is de primaire herstelfactor — indirect sterkst anabole stimulus',
      'Antioxidatieve eigenschappen; mogelijke bescherming spiercellen',
    ],
    warnings: [
      'Hoge doses (> 5 mg) geven geen betere slaap maar wél meer sufheid de volgende ochtend',
      'Niet structureel >3 mg bij jonge gezonde personen zonder slaapproblematiek',
      'Mogelijke interactie met antistolling en immunosuppressiva',
    ],
    keyStudies: [
      { authors: 'Ferracioli-Oda et al.', year: 2013, title: 'Meta-analysis: melatonin for the treatment of primary sleep disorders. PLOS ONE.' },
      { authors: 'Atkinson et al.', year: 2003, title: 'Melatonin and the circadian system: keys for health with a focus on daylight, sleep, and exercise. J Physiol.' },
    ],
    notes: 'Slaaphygiëne (donkere kamer, schermvrij uur voor bed, vaste bedtijden) heeft meer bewijs dan melatonine alleen.',
  },

  'vitamin b12': {
    grade: 'B',
    gradeLabel: 'Goed bewijs — essentieel bij veganisten/vegetariërs; nutteloos bij adequate inname',
    optimalDose: '250–1000 mcg/dag (cyanocobalamine of methylcobalamine)',
    optimalTiming: 'Ochtend bij maaltijd',
    benefits: [
      'Essentieel voor rode bloedcellen, DNA-aanmaak en zenuwfunctie',
      'Voorkomt megaloblastaire anemie (vermindert uithoudingsvermogen)',
      'Ondersteunt homocysteïnemetabolisme (cardiovasculair)',
    ],
    warnings: [
      'Geen bewezen voordeel bij reeds adequate serum B12-waarden',
      'Metformine-gebruik verlaagt B12-opname — extra aanvullen',
      'Laat serum B12 en MMA testen — serumwaarden alleen zijn soms misleidend',
    ],
    keyStudies: [
      { authors: 'Herrmann & Geisel', year: 2002, title: 'Vegetarian lifestyle and monitoring of vitamin B-12 status. Clin Chim Acta.' },
    ],
    notes: 'Dierlijke producten zijn de enige betrouwbare voedingsbron. Veganisten/vegetariërs moeten altijd supplementeren. Hoge doses zijn veilig (wateroplosbaar).',
  },

  'pre-workout': {
    grade: 'C',
    gradeLabel: 'Gemengd bewijs — effectief door cafeïne; overige ingrediënten variabel',
    optimalDose: 'Zie individuele ingrediënten (cafeïne 3–6 mg/kg; citrulline ≥ 6 g; beta-alanine ≥ 3,2 g)',
    optimalTiming: 'Pre-workout (30–45 min voor training)',
    benefits: [
      'Cafeïne-component levert bewezen prestatiewinst',
      'Combinatie met citrulline en beta-alanine kan effectief zijn',
      'Handig als kant-en-klare combinatie',
    ],
    warnings: [
      'Veel producten zijn underdosed op werkzame ingrediënten',
      'Proprietaire blends verbergen exacte doseringen',
      'Hoog cafeïnegehalte in sommige producten (>300 mg) — risico afhankelijkheid',
      'Vermijd gebruik na 14:00 vanwege slaapimpact',
    ],
    keyStudies: [
      { authors: 'Harty et al.', year: 2018, title: 'Multi-ingredient pre-workout supplements, safety implications, and performance outcomes: a brief review. J Int Soc Sports Nutr.' },
    ],
    notes: 'Los supplementeren van cafeïne + citrulline + beta-alanine geeft meer controle over doseringen en is doorgaans goedkoper.',
  },
};

// ---------------------------------------------------------------------------
// LOOKUP ALIASES (common alternative names / spellings)
// ---------------------------------------------------------------------------

const ALIASES: Record<string, string> = {
  // Creatine variants
  'creatine monohydrate': 'creatine',
  'creatinemonohydraat': 'creatine',
  'creatine hcl': 'creatine',
  'creatine hydrochloride': 'creatine',

  // Caffeine
  'caffeine': 'caffeine',
  'cafeïne': 'caffeine',
  'cafeine': 'caffeine',
  'koffie': 'caffeine',

  // Protein
  'whey': 'whey protein',
  'eiwit': 'whey protein',
  'proteïne': 'whey protein',
  'protein': 'whey protein',
  'eiwitpoeder': 'whey protein',
  'whey isolate': 'whey protein',
  'whey concentrate': 'whey protein',
  'casein': 'whey protein',
  'caseïne': 'whey protein',

  // Beta-alanine
  'beta alanine': 'beta-alanine',
  'bèta-alanine': 'beta-alanine',

  // Vitamin D
  'vitamine d': 'vitamin d',
  'vitamine d3': 'vitamin d',
  'd3': 'vitamin d',
  'cholecalciferol': 'vitamin d',

  // Omega-3
  'omega 3': 'omega-3',
  'fish oil': 'omega-3',
  'visolie': 'omega-3',
  'epa': 'omega-3',
  'dha': 'omega-3',
  'krillolie': 'omega-3',

  // Magnesium variants
  'magnesium bisglycinate': 'magnesium',
  'magnesium glycinate': 'magnesium',
  'magnesium malate': 'magnesium',
  'magnesiumbisglycinaat': 'magnesium',
  'magnesiumcitraat': 'magnesium',

  // Citrulline
  'citrulline': 'l-citrulline',
  'citrulline malate': 'l-citrulline',
  'citrulline-malaat': 'l-citrulline',
  'l citrulline': 'l-citrulline',

  // Ashwagandha
  'ksm-66': 'ashwagandha',
  'sensoril': 'ashwagandha',
  'withania somnifera': 'ashwagandha',

  // BCAA
  'bcaas': 'bcaa',
  'branched chain amino acids': 'bcaa',
  'aminozuren': 'bcaa',

  // Zinc
  'zink': 'zinc',
  'zma': 'zinc',

  // Melatonin
  'melatonine': 'melatonin',

  // Vitamin B12
  'vitamine b12': 'vitamin b12',
  'b12': 'vitamin b12',
  'cobalamine': 'vitamin b12',
  'methylcobalamine': 'vitamin b12',

  // Pre-workout
  'preworkout': 'pre-workout',
  'pre workout': 'pre-workout',
};

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/** Grade colour for Tailwind classes */
export const GRADE_COLORS: Record<EvidenceGrade, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  B: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  C: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  D: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
};

/**
 * Returns evidence data for a supplement name.
 * Case-insensitive; checks aliases automatically.
 * Returns null when the supplement is not in the database.
 */
export function getSupplementEvidence(name: string): SupplementEvidence | null {
  const key = name.toLowerCase().trim();
  // Direct hit
  if (SUPPLEMENT_SCIENCE_DB[key]) return SUPPLEMENT_SCIENCE_DB[key];
  // Alias hit
  const canonical = ALIASES[key];
  if (canonical && SUPPLEMENT_SCIENCE_DB[canonical]) return SUPPLEMENT_SCIENCE_DB[canonical];
  return null;
}

/** All supplement names in the DB (for autocomplete) */
export const KNOWN_SUPPLEMENTS = Object.keys(SUPPLEMENT_SCIENCE_DB).map(k =>
  k.charAt(0).toUpperCase() + k.slice(1)
);
