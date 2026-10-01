// Garantiert für jede Sehenswürdigkeit kurze, quiztaugliche Lernfakten.
// Basisfakten werden ausschließlich aus den strukturierten Orts-, Länder-, Typ- und UNESCO-Daten abgeleitet.
import { join } from 'node:path'
import { DATA, readJson, writeJson } from './lib/common.mjs'

const TYPE_LABELS = {
  archaeological: 'archäologische Stätte',
  bridge: 'Brücke',
  building: 'Bauwerk',
  castle: 'Burg oder Schloss',
  'cultural-landscape': 'Kulturlandschaft',
  engineering: 'Ingenieurbauwerk',
  fortification: 'Befestigungsanlage',
  garden: 'Gartenanlage',
  'historic-quarter': 'historisches Stadtviertel',
  landscape: 'Natur- oder Kulturlandschaft',
  memorial: 'Gedenkstätte',
  monastery: 'Klosteranlage',
  monument: 'Denkmal',
  palace: 'Palast oder Schloss',
  religious: 'Sakralbau',
  skyscraper: 'Wolkenkratzer',
  square: 'Platzanlage',
  tower: 'Turm',
  unesco: 'UNESCO-Stätte',
}

const CONTINENT_LABELS = {
  europe: 'Europa',
  asia: 'Asien',
  africa: 'Afrika',
  'north-america': 'Nordamerika',
  'south-america': 'Südamerika',
  oceania: 'Ozeanien',
  antarctica: 'Antarktika',
}

// Ergänzende, bewusst kurz gehaltene Merksätze für besonders bekannte Orte.
const HIGHLIGHTS = {
  'landmark:aachen-cathedral':
    'Der Aachener Dom war 1978 die erste deutsche Stätte auf der UNESCO-Welterbeliste.',
  'landmark:acropolis': 'Der Parthenon ist der bekannteste Tempel auf dem Athener Burgberg.',
  'landmark:alhambra': 'Die Alhambra verbindet Palast-, Festungs- und Gartenarchitektur.',
  'landmark:angkor':
    'Angkor Wat wurde ursprünglich als hinduistischer Tempel errichtet und später buddhistisch genutzt.',
  'landmark:atomium': 'Das Bauwerk stellt eine stark vergrößerte Kristallstruktur aus neun Kugeln dar.',
  'landmark:borobudur': 'Borobudur ist eine terrassenförmig aufgebaute buddhistische Tempelanlage.',
  'landmark:brandenburg-gate': 'Das Tor wurde zu einem Symbol der deutschen Teilung und Wiedervereinigung.',
  'landmark:burj-khalifa': 'Der Burj Khalifa erreicht eine Höhe von 828 Metern.',
  'landmark:chain-bridge': 'Die Kettenbrücke verbindet Buda und Pest über die Donau.',
  'landmark:chichen-itza': 'Die Stufenpyramide El Castillo ist das bekannteste Bauwerk der Maya-Stätte.',
  'landmark:christ-redeemer': 'Die Christusstatue steht auf dem Berg Corcovado über Rio de Janeiro.',
  'landmark:cn-tower': 'Der CN Tower prägt die Skyline von Toronto als Fernseh- und Aussichtsturm.',
  'landmark:colosseum': 'Das elliptische Amphitheater bot Zehntausenden Zuschauern Platz.',
  'landmark:eiffel-tower':
    'Der Eiffelturm entstand als Eingangsbauwerk der Pariser Weltausstellung von 1889.',
  'landmark:forbidden-city': 'Die Verbotene Stadt war über Jahrhunderte der chinesische Kaiserpalast.',
  'landmark:galapagos': 'Die isolierte Tierwelt der Inseln beeinflusste Charles Darwins Evolutionstheorie.',
  'landmark:golden-gate': 'Die Hängebrücke überspannt die Meerenge zwischen San Francisco und Marin County.',
  'landmark:grand-canyon':
    'Der Colorado River hat die vielschichtige Schlucht über sehr lange Zeiträume geformt.',
  'landmark:great-barrier-reef': 'Das Great Barrier Reef ist das größte Korallenriffsystem der Erde.',
  'landmark:great-wall': 'Die Chinesische Mauer besteht aus vielen Bauabschnitten verschiedener Epochen.',
  'landmark:hagia-sophia': 'Die Hagia Sophia wurde nacheinander als Kirche, Moschee und Museum genutzt.',
  'landmark:hallgrimskirkja': 'Die Fassade erinnert an die basaltartigen Lavaformationen Islands.',
  'landmark:iguazu': 'Das Wasserfallsystem verteilt sich über die Grenze zwischen Argentinien und Brasilien.',
  'landmark:liberty': 'Frankreich schenkte die Freiheitsstatue den Vereinigten Staaten.',
  'landmark:machu-picchu': 'Die Inkastätte liegt auf einem Bergrücken in den peruanischen Anden.',
  'landmark:mount-fuji': 'Der nahezu symmetrische Vulkan gilt in Japan als heiliger Berg.',
  'landmark:opera-house': 'Die markanten Dachschalen des Opernhauses erinnern an Segel.',
  'landmark:panama-canal': 'Der Kanal verbindet Atlantik und Pazifik über eine Folge von Schleusen.',
  'landmark:petra': 'Viele Fassaden Petras wurden direkt aus dem rötlichen Sandstein gemeißelt.',
  'landmark:pisa': 'Der Glockenturm begann sich schon während seiner jahrhundertelangen Bauzeit zu neigen.',
  'landmark:pyramids': 'Die Cheops-Pyramide ist das einzige erhaltene Weltwunder der Antike.',
  'landmark:rapa-nui': 'Die monumentalen Moai wurden von der polynesischen Bevölkerung Rapa Nuis geschaffen.',
  'landmark:sagrada-familia': 'Antoni Gaudí prägte den organischen Formenreichtum der Basilika.',
  'landmark:stonehenge':
    'Der Steinkreis wurde in mehreren Bauphasen der Jungsteinzeit und Bronzezeit errichtet.',
  'landmark:taj-mahal': 'Das Mausoleum wurde aus weißem Marmor erbaut.',
  'landmark:uluru': 'Uluṟu ist für die Aṉangu von großer spiritueller Bedeutung.',
  'landmark:venice': 'Venedig erstreckt sich auf zahlreichen Inseln in einer Lagune der Adria.',
  'landmark:victoria-falls':
    'Der Sambesi stürzt hier an der Grenze zwischen Sambia und Simbabwe in eine schmale Schlucht.',
  'landmark:palace-culture-warsaw':
    'Das Hochhaus ist eines der auffälligsten Bauwerke der Warschauer Skyline.',
  'landmark:little-mermaid':
    'Die Bronzefigur geht auf das gleichnamige Märchen von Hans Christian Andersen zurück.',
  'landmark:table-mountain': 'Das flache Gipfelplateau ist ein weithin sichtbares Wahrzeichen Kapstadts.',
  'landmark:african-renaissance':
    'Die monumentale Figurengruppe blickt von einem Hügel über Dakar und den Atlantik.',
  'landmark:independence-arch': 'Der Bogen erinnert an die Unabhängigkeit Ghanas.',
  'landmark:kigali-memorial': 'Die Gedenkstätte erinnert an die Opfer des Völkermords von 1994 in Ruanda.',
  'landmark:taipei-101': 'Die gestufte Form des Hochhauses ist von traditionellen Pagoden inspiriert.',
  'landmark:marina-bay-sands': 'Drei Hoteltürme tragen eine gemeinsame, schiffsähnliche Dachterrasse.',
  'landmark:tokyo-skytree':
    'Der Turm dient dem Rundfunk und besitzt öffentlich zugängliche Aussichtsplattformen.',
  'landmark:itsukushima-shrine': 'Das große Torii scheint bei Flut im Wasser zu stehen.',
  'landmark:hawa-mahal': 'Die reich gegliederte Fassade besitzt zahlreiche kleine Fenster und Erker.',
  'landmark:gateway-india': 'Der monumentale Torbogen steht direkt an der Hafenfront von Mumbai.',
  'landmark:lotus-temple': 'Die Form des Bahá’í-Tempels ist einer geöffneten Lotusblüte nachempfunden.',
  'landmark:wat-arun': 'Der zentrale Prang des Tempels prägt das Ufer des Chao Phraya.',
  'landmark:monas': 'Eine vergoldete Flamme krönt das indonesische Nationalmonument.',
  'landmark:independence-monument-cambodia': 'Das Denkmal ist in der Form eines Khmer-Lotusturms gestaltet.',
  'landmark:bahrain-world-trade-center':
    'Zwischen den beiden Türmen sind Windturbinen in Brücken integriert.',
  'landmark:sultan-qaboos-mosque':
    'Die große Moschee ist eines der wichtigsten modernen Wahrzeichen Maskats.',
  'landmark:dongdaemun-design-plaza':
    'Der fließend geformte Kulturkomplex wurde von Zaha Hadid Architects entworfen.',
  'landmark:space-needle': 'Der Aussichtsturm entstand für die Weltausstellung 1962 in Seattle.',
  'landmark:mount-rushmore': 'In den Granitfelsen sind die Köpfe von vier US-Präsidenten gehauen.',
  'landmark:gateway-arch': 'Der bogenförmige Bau erinnert an die westwärts gerichtete Expansion der USA.',
  'landmark:angel-independence':
    'Die vergoldete Siegesfigur steht auf einer hohen Säule am Paseo de la Reforma.',
  'landmark:chateau-frontenac': 'Das schlossartige Hotel dominiert die Silhouette der Altstadt von Québec.',
  'landmark:casa-rosada': 'Der rosafarbene Palast ist der Amtssitz des argentinischen Präsidenten.',
  'landmark:palacio-salvo': 'Das Hochhaus markiert die Plaza Independencia im Zentrum Montevideos.',
  'landmark:angel-falls': 'Der Salto Ángel gilt als höchster ununterbrochener Wasserfall der Erde.',
  'landmark:twelve-apostles':
    'Wind und Brandung formten die freistehenden Kalksteinfelsen an der Great Ocean Road.',
  'landmark:beehive-wellington':
    'Der runde Parlamentsflügel erhielt seinen Spitznamen wegen der bienenkorbartigen Form.',
}

const countries = readJson(join(DATA, 'entities', 'countries.json'))
const countryNames = new Map(countries.map((country) => [country.id, country.names.de]))
const path = join(DATA, 'entities', 'landmarks.json')
const landmarks = readJson(path)

for (const landmark of landmarks) {
  const attributes = landmark.attributes ?? {}
  const country = countryNames.get(attributes.country) ?? 'dem zugeordneten Land'
  const place = attributes.place_name || country
  const type = TYPE_LABELS[attributes.landmark_type] ?? 'Sehenswürdigkeit'
  const continent = CONTINENT_LABELS[attributes.continent] ?? 'der zugeordneten Weltregion'
  const facts = [
    `Standort: ${place}, ${country}.`,
    HIGHLIGHTS[landmark.id] ?? `${landmark.names.de} ist im Atlas als ${type} eingeordnet.`,
    attributes.unesco
      ? `Unter dem Namen „${attributes.unesco}“ gehört die Stätte zum UNESCO-Welterbe.`
      : `Der Standort liegt in der Weltregion ${continent}.`,
  ]
  landmark.attributes = { ...attributes, facts }
}

writeJson(path, landmarks)
console.log(`Sehenswürdigkeiten mit Kurzfakten: ${landmarks.length}/${landmarks.length}`)
