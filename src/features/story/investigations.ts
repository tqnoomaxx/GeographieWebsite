export type Coordinates = { lon: number; lat: number }
export type CaseEvidence = {
  id: string
  title: string
  kind: 'note' | 'report' | 'table' | 'telegram' | 'script' | 'archive'
  label: string
  text: string
  detail?: string
  rows?: [string, string][]
  glyphs?: string
}
export type CaseTarget = {
  id: string
  label: string
  answer: string
  location: Coordinates
  radiusKm: number
  feature?: string
}
export type MapPlace = Coordinates & { name: string; note?: string }
export type Investigation = {
  id: string
  title: string
  region: string
  difficulty: string
  theme: string
  accent: string
  map: string
  bounds: [number, number, number, number]
  intro: string
  objective: string
  targets: CaseTarget[]
  evidence: CaseEvidence[]
  proof: string[]
  reject?: { id: string; explanation: string }
  calculation?: { label: string; unit: string; answer: number; feedback: string }
  hints: string[]
  solution: string
  ending: string
  fragment: { label: string; value: string }
  sources: { label: string; url: string }[]
  places: MapPlace[]
  labels?: MapPlace[]
}

const target = (
  id: string,
  label: string,
  answer: string,
  lon: number,
  lat: number,
  radiusKm: number,
): CaseTarget => ({ id, label, answer, location: { lon, lat }, radiusKm })
const place = (name: string, lon: number, lat: number, note?: string): MapPlace => ({ name, lon, lat, note })

/** Fictional documents; all geographic deductions use the cited real places and data. */
const CASE_FILES: Investigation[] = [
  {
    id: 'flussprotokoll',
    title: 'Das Flussprotokoll',
    region: 'Kaukasus',
    difficulty: 'Spuren kombinieren',
    theme: 'olive',
    accent: '#c6b474',
    map: 'caucasus',
    bounds: [44.59, 41.69, 44.91, 41.91],
    intro:
      'Ein Paket ohne Absender. Darin: das Archiv einer verschwundenen Kartografin. Der erste Reisebericht nennt zwei verschiedene Zielmeere. Einer der Einträge wurde nachträglich verändert.',
    objective:
      'Markiere den beschriebenen Zusammenfluss. Belege den Ort mit zwei Unterlagen und kennzeichne den unzuverlässigen Bericht.',
    targets: [
      target('confluence', 'Zusammenfluss', 'Aragvi und Mtkvari bei Mzcheta', 44.74808, 41.8388, 1.1),
    ],
    evidence: [
      {
        id: 'bearing',
        kind: 'note',
        label: 'FELDNOTIZ / ORIGINAL',
        title: 'Vom Ausgangspunkt aus',
        text: 'Von Tiflis aus ungefähr 15 Kilometer Luftlinie nach Nordnordwest. Wir standen dort, wo ein von Norden kommender Fluss in den größeren Strom mündet.',
        detail: 'Nutze das Lineal. Straßenkilometer sind hier ausdrücklich nicht gemeint.',
      },
      {
        id: 'water',
        kind: 'table',
        label: 'GEWÄSSERREGISTER',
        title: 'Zwei Namen für einen Strom',
        text: 'Mtkvari und Kura bezeichnen denselben Fluss. Der Aragvi kommt aus dem Großen Kaukasus und mündet in den Mtkvari. Die Kura entwässert ins Kaspische Meer.',
        rows: [
          ['Mtkvari / Kura', 'Kaspisches Meer'],
          ['Aragvi', 'Nebenfluss des Mtkvari'],
        ],
      },
      {
        id: 'west-report',
        kind: 'report',
        label: 'REISEBERICHT / FASSUNG B',
        title: 'Die westliche Fassung',
        text: 'Wir ließen Tiflis hinter uns und erreichten den Zusammenfluss. Von hier trägt die Kura unser Wasser bis ins Schwarze Meer.',
        detail: 'Die Handschrift wechselt mitten im letzten Satz.',
      },
      {
        id: 'envelope',
        kind: 'telegram',
        label: 'BEILAGE',
        title: 'An die Person im Hinterzimmer',
        text: 'Die Akten wurden vertauscht. Vertraue weder der Reihenfolge noch einem einzelnen Bericht. Bewahre die Koordinatenfragmente aus den versiegelten Umschlägen auf.',
      },
    ],
    proof: ['bearing', 'water'],
    reject: {
      id: 'west-report',
      explanation: 'Die Kura fließt ins Kaspische Meer. Die Angabe „Schwarzes Meer“ wurde eingeschoben.',
    },
    hints: [
      'Suche nordnordwestlich von Tiflis. Mit dem Lineal kannst du Richtung und Luftlinie prüfen.',
      'Der gesuchte Zufluss kommt auf der Karte von Norden. Die beiden verlässlichen Unterlagen beschreiben Lage und Einzugsgebiet.',
      'Der Zusammenfluss liegt bei 41,839° N und 44,726° E. Prüfe im Gewässerregister das Zielmeer der Kura.',
    ],
    solution:
      'Der Aragvi mündet bei Mzcheta in den Mtkvari, etwa 14 Kilometer Luftlinie nordnordwestlich des Kartenpunkts Tiflis. Die Kura erreicht das Kaspische Meer. Lage und Gewässerregister stützen dieselbe Schlussfolgerung.',
    ending:
      'Unter der falschen Abschrift steckt ein Grenzprotokoll. Auf dem Umschlag steht: „Der Umweg existiert nicht.“ Der erste versiegelte Streifen enthält den Gradanteil einer Breite.',
    fragment: { label: 'Breite · Grad', value: '35' },
    sources: [
      {
        label: 'Universität Exeter · Zusammenfluss bei Mzcheta',
        url: 'https://architectureandasceticism.exeter.ac.uk/items/show/80',
      },
      { label: 'UNESCO · Mzcheta', url: 'https://whc.unesco.org/en/list/708/' },
    ],
    places: [place('Tiflis', 44.7925, 41.7225)],
    labels: [place('Aragvi', 44.737, 41.873), place('Mtkvari / Kura', 44.66, 41.843)],
  },
  {
    id: 'grenzroute',
    title: 'Die unmögliche Grenzroute',
    region: 'Westbalkan',
    difficulty: 'Grenzen & Gegenbeweise',
    theme: 'slate',
    accent: '#9cb5b8',
    map: 'balkans',
    bounds: [16.8, 40.5, 22.5, 44.8],
    intro:
      'Das Grenzprotokoll passt nicht zum Reisebericht. Die Kartografin reiste über Land von Tirana nach Sarajevo. Im Archiv sind zwei verschiedene Zwischenstopps eingetragen.',
    objective:
      'Rekonstruiere die drei Stationen in Reiserichtung. Es gab genau zwei Grenzübertritte und nur einen Transitstaat.',
    targets: [
      target('start', 'Start', 'Tirana', 19.8181, 41.3283, 18),
      target('transit', 'Zwischenstopp', 'Podgorica', 19.2628, 42.4414, 18),
      target('finish', 'Ziel', 'Sarajevo', 18.4131, 43.8564, 18),
    ],
    evidence: [
      {
        id: 'border-log',
        kind: 'table',
        label: 'GRENZPROTOKOLL',
        title: 'Zwei Stempel',
        text: 'Abfahrt Albanien. Ankunft Bosnien und Herzegowina. Dazwischen genau ein weiteres Land. Keine Fähre, kein Flug.',
        rows: [
          ['Start', 'Tirana'],
          ['Grenzübertritte', '2'],
          ['Ziel', 'Sarajevo'],
        ],
      },
      {
        id: 'transit-note',
        kind: 'report',
        label: 'NOTIZ / ORIGINAL',
        title: 'Das Land dazwischen',
        text: 'Unser einziger Zwischenstopp war die heutige Hauptstadt des Transitstaats. Dieser hat eine Adriaküste und eine gemeinsame Landgrenze sowohl mit Albanien als auch mit Bosnien und Herzegowina.',
      },
      {
        id: 'skopje-report',
        kind: 'report',
        label: 'REISEBERICHT / FASSUNG B',
        title: 'Der vermeintlich direkte Weg',
        text: 'Wir übernachteten in Skopje. Am Morgen überquerten wir von Nordmazedonien aus direkt die Grenze nach Bosnien und Herzegowina.',
      },
      {
        id: 'baggage',
        kind: 'telegram',
        label: 'GEPÄCKVERZEICHNIS',
        title: 'Ohne Belang?',
        text: 'Drei Karten, ein Kompass, ein versiegelter Streifen. Keine Angaben zu Datum oder Strecke.',
      },
    ],
    proof: ['border-log', 'transit-note'],
    reject: {
      id: 'skopje-report',
      explanation:
        'Nordmazedonien und Bosnien und Herzegowina haben keine gemeinsame Grenze. Montenegro verbindet dagegen die beiden Endstaaten.',
    },
    hints: [
      'Blende die Ortsnamen ein und verfolge die Staatsgrenzen. Der Zwischenstaat muss beide Endstaaten berühren.',
      'Gesucht ist die Hauptstadt Montenegros. Skopje liegt in Nordmazedonien.',
      'Die Reihenfolge lautet Tirana → Podgorica → Sarajevo. Die Abschrift über Skopje behauptet eine nicht existierende Grenze.',
    ],
    solution:
      'Tirana → Podgorica → Sarajevo. Albanien grenzt an Montenegro, Montenegro an Bosnien und Herzegowina. Die behauptete direkte Grenze Nordmazedonien–Bosnien existiert nicht.',
    ending:
      'Die falsche Route wurde in derselben Tinte wie das falsche Zielmeer ergänzt. Im nächsten Umschlag liegt eine namenlose Seekarte. Der Streifen ergänzt die Breitenminuten.',
    fragment: { label: 'Breite · Minuten', value: '53,2' },
    sources: [
      {
        label: 'Regierung Montenegro · Grenzübergänge',
        url: 'https://www.gov.me/en/government-of-montenegro/visas-and-entry-requirements',
      },
    ],
    places: [
      place('Tirana', 19.8181, 41.3283),
      place('Podgorica', 19.2628, 42.4414),
      place('Sarajevo', 18.4131, 43.8564),
      place('Skopje', 21.4314, 41.9965),
      place('Pristina', 21.1622, 42.6629),
      place('Belgrad', 20.46, 44.82),
    ],
    labels: [
      place('Montenegro', 18.8, 42.85),
      place('Albanien', 20.08, 40.8),
      place('Bosnien u. Herzegowina', 17.7, 44.2),
      place('Nordmazedonien', 21.5, 41.5),
      place('Adria', 17.6, 41.7),
    ],
  },
  {
    id: 'namenloser-see',
    title: 'Der See ohne Namen',
    region: 'Ostafrika',
    difficulty: 'Einzugsgebiete lesen',
    theme: 'lake',
    accent: '#b3c7ba',
    map: 'africa',
    bounds: [26.5, -15, 38, 4],
    intro:
      'Auf der Seekarte wurden die Namen entfernt. Ein Reisebericht erwähnt den Nil. Eine Messnotiz nennt einen westlichen Abfluss. Beides passt nicht zum selben See.',
    objective:
      'Markiere die Wasserfläche des gesuchten Sees. Verbinde seine Form mit den Angaben zu Ufern und Abfluss.',
    targets: [
      { ...target('lake', 'Gesuchter See', 'Tanganjikasee', 29.5, -6.2, 220), feature: 'lake:tanganyika' },
    ],
    evidence: [
      {
        id: 'shore',
        kind: 'table',
        label: 'UFERPROTOKOLL',
        title: 'Vier Anrainer',
        text: 'Ein langer, schmaler See in Nord-Süd-Richtung. Vier Staaten teilen sich seine Ufer.',
        rows: [
          ['Nordufer', 'Burundi'],
          ['Westufer', 'DR Kongo'],
          ['Ostufer', 'Tansania'],
          ['Südende', 'Sambia'],
        ],
      },
      {
        id: 'outflow',
        kind: 'note',
        label: 'HYDROLOGISCHE NOTIZ',
        title: 'Der Weg des Wassers',
        text: 'Der Abfluss heißt Lukuga und verlässt den See am Westufer. Er erreicht den Lualaba, also den Oberlauf des Kongo. Das Wasser gelangt schließlich in den Atlantik.',
      },
      {
        id: 'nile-report',
        kind: 'note',
        label: 'REISEBERICHT / FASSUNG B',
        title: 'Die nördliche Fassung',
        text: 'Nach der Überfahrt verfolgten wir den einzigen Abfluss unseres Sees nach Norden. Ohne Wasserscheide führte er direkt in das Nil-System.',
      },
      {
        id: 'packing',
        kind: 'telegram',
        label: 'FUNKMELDUNG',
        title: 'Die Kiste ist trocken',
        text: 'Das Material wurde an Bord verstaut. Die Nachricht enthält weder Ortsnamen noch Richtungen.',
      },
    ],
    proof: ['shore', 'outflow'],
    reject: {
      id: 'nile-report',
      explanation:
        'Der Tanganjikasee entwässert über den Lukuga zum Kongo und damit zum Atlantik. Die Nil-Angabe widerspricht diesem Einzugsgebiet.',
    },
    hints: [
      'Vergleiche zuerst die Form der großen Seen und die vier Uferstaaten. Die gesuchte Wasserfläche ist nicht der breite Viktoriasee.',
      'Der See liegt zwischen DR Kongo und Tansania; Burundi und Sambia berühren seine Enden.',
      'Markiere den Tanganjikasee. Das Uferprotokoll und die Lukuga-Notiz belegen ihn; der Nil-Bericht passt nicht.',
    ],
    solution:
      'Gesucht ist der Tanganjikasee. Seine vier Anrainer und der westliche Abfluss Lukuga stimmen überein. Er gehört zum Kongo-Einzugsgebiet, nicht zum Nil.',
    ending:
      'Die Seekarte war richtig, nur ihre Zuordnung wurde verändert. Ein Flugprotokoll im nächsten Fach scheint sogar die Zeit rückwärts laufen zu lassen.',
    fragment: { label: 'Länge · Grad', value: '014' },
    sources: [
      {
        label: 'Lake Tanganyika Authority · See und Anrainer',
        url: 'https://lta-alt.org/wp-content/uploads/2023/10/ENGL_TOR_-RECRUITMENT_CONSULTANT_RESTORATION_DEGRADED_AREAS_LT.pdf',
      },
      {
        label: 'Tansanisches Fischereiministerium · Tanganjikasee und Lukuga',
        url: 'https://mifugouvuvi.go.tz/uploads/documents/sw-1756496095-FINAL-ENGL-%20REPORT%20ON%20THE%202024%20FRAME%20SURVEY%20OF%20FISHERIES%20IN%20LAKETANGANYIKA_02.06.2025.pdf',
      },
    ],
    places: [
      place('Bujumbura', 29.36, -3.38),
      place('Kigoma', 29.63, -4.88),
      place('Kalemie', 29.19, -5.95),
      place('Kampala', 32.58, 0.35),
    ],
    labels: [
      place('DR Kongo', 27.5, -5),
      place('Tansania', 34.7, -6.5),
      place('Burundi', 29.9, -3.15),
      place('Sambia', 28.7, -12.5),
      place('Uganda', 32.2, 2.4),
      place('Malawi', 34.5, -13.5),
    ],
  },
  {
    id: 'doppelter-dienstag',
    title: 'Der doppelte Dienstag',
    region: 'Samoa-Inseln',
    difficulty: 'Zeit & Datum rekonstruieren',
    theme: 'night',
    accent: '#b0bbd0',
    map: 'samoa',
    bounds: [-173.2, -15.2, -168.8, -12.6],
    intro:
      'Ein Flug startet am Dienstag und landet am Montag. Die Archivnotiz erklärt ihn deshalb für unmöglich. Doch die Datumsgrenze folgt hier nicht dem 180. Längengrad.',
    objective:
      'Setze Start und Ziel des protokollierten Fluges. Berechne die verstrichene Zeit in Minuten und prüfe die Behauptung des Archivars.',
    targets: [
      target('departure', 'Abflug', 'Apia', -171.8333, -13.8333, 20),
      target('arrival', 'Ankunft', 'Pago Pago', -170.7006, -14.2794, 20),
    ],
    evidence: [
      {
        id: 'flight-log',
        kind: 'table',
        label: 'FLUGPROTOKOLL / FIKTIVE REISE',
        title: 'Die beiden Ortszeiten',
        text: 'Das Original nennt die Verwaltungszentren, nicht die Flughäfen. Beide Uhren wurden vor Ort abgelesen.',
        rows: [
          ['Abflug · Apia', 'Di, 14.07.2026 · 00:20'],
          ['Ankunft · Pago Pago', 'Mo, 13.07.2026 · 01:00'],
        ],
      },
      {
        id: 'offsets',
        kind: 'table',
        label: 'ZEITZONENBLATT / JULI 2026',
        title: 'Die fehlenden Vorzeichen',
        text: 'Für diesen Fall gelten die folgenden UTC-Abstände. Rechne beide Ortszeiten auf dieselbe Zeitskala um.',
        rows: [
          ['Apia · Samoa', 'UTC +13'],
          ['Pago Pago · Amerikanisch-Samoa', 'UTC −11'],
        ],
      },
      {
        id: 'archivist',
        kind: 'note',
        label: 'ARCHIVVERMERK',
        title: 'Eine vorschnelle Korrektur',
        text: 'Montag liegt immer vor Dienstag. Die Ankunft ist daher vor dem Abflug erfolgt. Das Flugprotokoll muss gefälscht sein.',
      },
      {
        id: 'longitude',
        kind: 'note',
        label: 'KARTENRAND',
        title: 'Keine gerade Linie',
        text: 'Die politische Datumsgrenze macht in dieser Region einen Umweg. Die Länge eines Ortes allein verrät hier nicht seinen UTC-Abstand.',
      },
    ],
    proof: ['flight-log', 'offsets'],
    reject: {
      id: 'archivist',
      explanation:
        'Verschiedene Ortsdaten lassen sich erst nach der UTC-Umrechnung vergleichen. Der scheinbare Sprung in den Montag ist kein Zeitreise-Beweis.',
    },
    calculation: {
      label: 'Verstrichene Zeit',
      unit: 'Minuten',
      answer: 40,
      feedback:
        'Ziehe in Apia 13 Stunden ab und addiere in Pago Pago 11 Stunden. Vergleiche dann Datum und Uhrzeit in UTC.',
    },
    hints: [
      'Bei UTC +13 erhältst du UTC, indem du 13 Stunden abziehst. Bei UTC −11 addierst du 11 Stunden.',
      'Der Abflug entspricht Montag 11:20 UTC. Berechne nun die Ankunft auf derselben Skala.',
      'Ankunft: Montag 12:00 UTC. Es vergehen 40 Minuten. Die Strecke lautet Apia → Pago Pago; der Archivvermerk irrt.',
    ],
    solution:
      'Apia → Pago Pago. Dienstag 00:20 in Apia entspricht Montag 11:20 UTC. Montag 01:00 in Pago Pago entspricht Montag 12:00 UTC. Die verstrichene Zeit beträgt 40 Minuten.',
    ending:
      'Diesmal war das Original korrekt und die angebliche Verbesserung falsch. Zwischen den Seiten steckt eine Höhenmessung aus den Anden.',
    fragment: { label: 'Länge · Minuten', value: '24,2' },
    sources: [
      {
        label: 'IANA · Zeitzonenregeln für den Pazifik',
        url: 'https://data.iana.org/time-zones/tzdb/australasia',
      },
      { label: 'US Naval Observatory · Samoa Standard Time', url: 'https://aa.usno.navy.mil/faq/us_tzones' },
    ],
    places: [
      place('Apia', -171.8333, -13.8333),
      place('Pago Pago', -170.7006, -14.2794),
      place('Salelologa', -172.178, -13.743),
    ],
    labels: [
      place('Savaiʻi', -172.45, -13.5),
      place('Upolu · Samoa', -171.7, -14.02),
      place('Tutuila · Amerikanisch-Samoa', -170.5, -14.48),
    ],
  },
  {
    id: 'ueber-dem-pass',
    title: 'Über dem Pass',
    region: 'Anden',
    difficulty: 'Drei Bedingungen gleichzeitig',
    theme: 'rust',
    accent: '#d0aa89',
    map: 'andes',
    bounds: [-70.5, -28, -64.3, -21],
    intro:
      'Vier Grenzpunkte stehen auf einem Messblatt. Der Name des benutzten Übergangs fehlt. Eine Abschrift behauptet, ein Höhenwert allein reiche für die Zuordnung.',
    objective:
      'Finde den Grenzkomplex, der alle Bedingungen erfüllt. Berechne den Abstand seiner Registerhöhe zur oberen Grenze von 4.300 Metern.',
    targets: [target('pass', 'Grenzkomplex', 'Jama', -67.02, -23.23, 30)],
    evidence: [
      {
        id: 'conditions',
        kind: 'note',
        label: 'MESSAUFTRAG',
        title: 'Das Suchfenster',
        text: 'Gesucht ist ein Grenzkomplex zwischen Chile und Argentinien, nördlich des südlichen Wendekreises (ungefähr 23,44° S). Seine eingetragene Höhe liegt zwischen 4.000 und 4.300 Metern.',
        detail:
          'Die Registerhöhe bezeichnet den Grenzkomplex, nicht die größte Höhe der gesamten Anfahrtsstraße.',
      },
      {
        id: 'heights',
        kind: 'table',
        label: 'GRENZREGISTER',
        title: 'Vier Einträge',
        text: 'Die Punkte auf der Karte entsprechen diesen Grenzkomplexen. Breite und Landgrenzen lassen sich auf der Karte prüfen.',
        rows: [
          ['Jama', '4.200 m'],
          ['Sico', '4.080 m'],
          ['San Francisco', '4.748 m'],
          ['Hito Cajón', '4.549 m'],
        ],
      },
      {
        id: 'sico-report',
        kind: 'telegram',
        label: 'ABSCHRIFT',
        title: 'Die schnelle Zuordnung',
        text: 'Sico liegt unter 4.300 Metern und muss daher der gesuchte Übergang sein. Die übrigen Angaben können wir ignorieren.',
      },
      {
        id: 'reference',
        kind: 'telegram',
        label: 'TECHNISCHE BEILAGE',
        title: 'Südliche Breiten',
        text: 'Auf der Südhalbkugel bedeutet ein kleinerer Betrag der geografischen Breite eine nördlichere Lage. 23,2° S liegt nördlich von 23,44° S.',
      },
    ],
    proof: ['conditions', 'heights'],
    reject: {
      id: 'sico-report',
      explanation:
        'Sico erfüllt das Höhenfenster, liegt aber südlich des Wendekreises. Nur Jama erfüllt alle drei Bedingungen.',
    },
    calculation: {
      label: 'Abstand zur Obergrenze',
      unit: 'Meter',
      answer: 100,
      feedback: 'Ziehe die Registerhöhe des passenden Grenzkomplexes von 4.300 Metern ab.',
    },
    hints: [
      'Prüfe erst Landpaar und Breite, dann das Höhenfenster. Ein einzelner passender Wert genügt nicht.',
      'Sico liegt bei etwa 23,9° S und damit südlich des Wendekreises. Hito Cajón führt nach Bolivien und liegt außerdem zu hoch.',
      'Jama liegt bei etwa 23,23° S und hat eine Registerhöhe von 4.200 Metern. Zur Obergrenze fehlen 100 Meter.',
    ],
    solution:
      'Jama verbindet Chile mit Argentinien, liegt nördlich von 23,44° S und wird mit 4.200 Metern geführt. Der Abstand zu 4.300 Metern beträgt 100 Meter. Sico scheitert an der Breite.',
    ending:
      'Der Umschlag enthält nur ein N. Die Kartografin schrieb daneben: „Ein passender Hinweis ist noch kein Beweis.“ Die nächste Akte enthält zwei unterschiedliche Schriften.',
    fragment: { label: 'Breite · Hemisphäre', value: 'N' },
    sources: [
      {
        label: 'Chile · Grenzkomplex Jama',
        url: 'https://www.pasosfronterizos.gov.cl/complejos-fronterizos/antofagasta/paso-jama/',
      },
      {
        label: 'Chile · Grenzkomplex Sico',
        url: 'https://www.pasosfronterizos.gov.cl/complejos-fronterizos/antofagasta/paso-sico/',
      },
      {
        label: 'Chile · Grenzkomplex San Francisco',
        url: 'https://www.pasosfronterizos.gov.cl/complejos-fronterizos/atacama/paso-san-francisco/',
      },
      {
        label: 'Chile · Grenzkomplex Hito Cajón',
        url: 'https://www.pasosfronterizos.gov.cl/complejos-fronterizos/antofagasta/paso-hito-cajon/',
      },
      {
        label: 'Argentinien · Paso Jama',
        url: 'https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/19/Jama',
      },
    ],
    places: [
      place('Jama', -67.02, -23.23, '4.200 m'),
      place('Sico', -67.25, -23.87, '4.080 m'),
      place('San Francisco', -68.3, -26.87, '4.748 m'),
      place('Hito Cajón', -67.8, -22.88, '4.549 m'),
      place('San Pedro de Atacama', -68.2, -22.91),
    ],
    labels: [
      place('Chile', -69.6, -25.1),
      place('Argentinien', -65.7, -25.1),
      place('Bolivien', -66.1, -21.7),
    ],
  },
  {
    id: 'vertauschte-etiketten',
    title: 'Vertauschte Etiketten',
    region: 'Mekong · Laos',
    difficulty: 'Schrift, Lage & Geschichte',
    theme: 'jade',
    accent: '#b9c49b',
    map: 'mekong-north',
    bounds: [98, 14, 108, 22],
    intro:
      'Zwei Archivhüllen wurden vertauscht. Ein laotisches Etikett steckt beim Bericht aus Kambodscha. Der gesuchte Aufnahmeort muss deshalb aus drei unabhängigen Angaben erschlossen werden.',
    objective:
      'Ordne das laotische Etikett der richtigen Stadt zu. Vergleiche Schrift, Lage am Fluss und die heutige Hauptstadt.',
    targets: [target('city', 'Aufnahmeort', 'Luang Prabang', 102.135, 19.89, 22)],
    evidence: [
      {
        id: 'script-key',
        kind: 'script',
        label: 'SCHRIFTVERGLEICH',
        title: 'Das Etikett',
        text: 'Auf dem Original sind diese drei Buchstaben erhalten. Der Vergleichsschlüssel identifiziert das Schriftsystem, nicht den Ortsnamen.',
        glyphs: 'ລ  ວ  ງ',
        rows: [
          ['Lao', 'ລ · ວ · ງ'],
          ['Khmer', 'ល · វ · ង'],
          ['Thai', 'ล · ว · ง'],
        ],
      },
      {
        id: 'peninsula',
        kind: 'report',
        label: 'STANDORTNOTIZ',
        title: 'Auf einer Halbinsel',
        text: 'Die Stadt liegt in Laos, am Zusammenfluss von Mekong und Nam Khan. Sie liegt nördlich der heutigen Hauptstadt Vientiane und war selbst einst königliche Hauptstadt.',
      },
      {
        id: 'capital-report',
        kind: 'report',
        label: 'BILDVERZEICHNIS',
        title: 'Die vertauschte Hülle',
        text: 'Das Etikett gehört zu Phnom Penh, der heutigen Hauptstadt Kambodschas. Auf der Rückseite wird die Schrift als Khmer eingeordnet.',
      },
      {
        id: 'ticket',
        kind: 'telegram',
        label: 'FAHRSCHEINREST',
        title: 'Ein unvollständiger Beleg',
        text: 'Der Fahrpreis ist lesbar. Abfahrtsort und Datum fehlen. Damit lässt sich kein Aufnahmeort belegen.',
      },
    ],
    proof: ['script-key', 'peninsula'],
    reject: {
      id: 'capital-report',
      explanation:
        'Das Etikett verwendet Lao. Dazu passen die Lage in Laos und die Halbinsel von Luang Prabang, nicht die Zuordnung zu Phnom Penh und Khmer.',
    },
    hints: [
      'Du brauchst die Schrift nicht auswendig zu kennen: Vergleiche die Formen direkt mit dem Schlüssel.',
      'Vientiane ist die heutige Hauptstadt. Suche flussaufwärts und weiter nördlich nach der ehemaligen königlichen Hauptstadt.',
      'Das Etikett ist Lao. Der Zusammenfluss von Mekong und Nam Khan liegt bei Luang Prabang. Die Bildverzeichnis-Abschrift ist falsch.',
    ],
    solution:
      'Lao-Schrift und Standortnotiz führen nach Luang Prabang. Die UNESCO beschreibt die Stadt auf der von Mekong und Nam Khan geformten Halbinsel. Die Zuordnung zu Phnom Penh wurde vertauscht.',
    ending:
      'Hinter dem laotischen Etikett liegt der zweite Hemisphärenbuchstabe: E. Drei Berichte aus demselben Flussgebiet müssen noch in die richtige Reihenfolge gebracht werden.',
    fragment: { label: 'Länge · Hemisphäre', value: 'E' },
    sources: [
      { label: 'UNESCO · Luang Prabang', url: 'https://whc.unesco.org/en/list/479/' },
      { label: 'Unicode · Lao-Schriftzeichen', url: 'https://www.unicode.org/charts/PDF/U0E80.pdf' },
    ],
    places: [
      place('Luang Prabang', 102.135, 19.89),
      place('Vientiane', 102.63, 17.98),
      place('Pakse', 105.78, 15.12),
      place('Chiang Mai', 98.99, 18.79),
      place('Hanoi', 105.84, 21.03),
    ],
    labels: [
      place('Laos', 103.6, 19.1),
      place('Thailand', 100.7, 16.4),
      place('Vietnam', 106.7, 19.3),
      place('Mekong', 101.3, 20.4),
    ],
  },
  {
    id: 'drei-berichte',
    title: 'Drei Berichte, eine Reise',
    region: 'Mekong · Unterlauf',
    difficulty: 'Vier Stationen, ein Widerspruch',
    theme: 'indigo',
    accent: '#b9b7cc',
    map: 'mekong',
    bounds: [99, 8.3, 108.6, 22],
    intro:
      'Die Seitennummern sind unbrauchbar. Drei Berichte beschreiben eine Reise am Mekong vom Bergland bis ins Delta. Einer der Sätze kehrt die Flussrichtung um.',
    objective:
      'Rekonstruiere die vier Stationen in Fließrichtung. Die Berichte nennen sie über ihre Merkmale. Prüfe dabei besonders das vertauschte Richtungswort.',
    targets: [
      target('mountains', 'Station 1', 'Luang Prabang', 102.135, 19.89, 25),
      target('laos-capital', 'Station 2', 'Vientiane', 102.63, 17.98, 25),
      target('cambodia-capital', 'Station 3', 'Phnom Penh', 104.921, 11.57, 25),
      target('delta', 'Station 4', 'Cần Thơ', 105.786, 10.045, 25),
    ],
    evidence: [
      {
        id: 'route-notes',
        kind: 'report',
        label: 'BERICHT A / FELDAUFZEICHNUNG',
        title: 'Vom Bergland ins Delta',
        text: 'Wir begannen auf der Halbinsel aus der vorigen Akte. Zuletzt erreichten wir die Deltastadt mit dem Buchstaben ơ im Namen. Dazwischen lagen die heutigen Hauptstädte von Laos und Kambodscha. Die Reise folgte der Richtung des abfließenden Wassers; die Seitenfolge im Archiv ist verloren.',
      },
      {
        id: 'basin',
        kind: 'table',
        label: 'BERICHT C / GEWÄSSERREGISTER',
        title: 'Ein gemeinsames Flusssystem',
        text: 'Der Mekong führt aus dem nördlichen Bergland durch Laos und Kambodscha bis zum Delta in Vietnam. Er mündet in das Südchinesische Meer.',
        rows: [
          ['Hochland → Delta', 'Laos → Kambodscha → Vietnam'],
          ['Mündung', 'Südchinesisches Meer'],
        ],
      },
      {
        id: 'reverse',
        kind: 'report',
        label: 'BERICHT B / REISENOTIZ',
        title: 'Eine vertauschte Richtung',
        text: 'Von Vientiane aus erreichten wir Luang Prabang, indem wir dem Mekong weiter flussabwärts folgten.',
      },
      {
        id: 'pagination',
        kind: 'telegram',
        label: 'ARCHIVNOTIZ',
        title: 'Die Nummern helfen nicht',
        text: 'Die Seiten wurden nach dem Trocknen neu nummeriert. Ihre Nummern bilden keine zeitliche Reihenfolge ab.',
      },
    ],
    proof: ['route-notes', 'basin'],
    reject: {
      id: 'reverse',
      explanation:
        'Luang Prabang liegt am Mekong oberhalb von Vientiane. Die Abschrift vertauscht flussaufwärts und flussabwärts.',
    },
    hints: [
      'Verfolge den Mekong von Nordlaos durch Kambodscha bis ins vietnamesische Delta. Die Verbindungslinie deiner Pins ist nur eine Reihenfolgehilfe, keine Straßen- oder Bootsroute.',
      'Der nördliche Startpunkt ist Luang Prabang. Cần Thơ liegt im südlichen Delta. Dazwischen folgen zwei Hauptstädte.',
      'Luang Prabang → Vientiane → Phnom Penh → Cần Thơ. Bericht B kehrt die Flussrichtung zwischen den ersten beiden Orten um.',
    ],
    solution:
      'Die Reihenfolge lautet Luang Prabang → Vientiane → Phnom Penh → Cần Thơ. Von Vientiane nach Luang Prabang geht es am Mekong flussaufwärts. Bericht B ist deshalb die falsche Abschrift.',
    ending:
      'Die Kartografin ist nicht spurlos verschwunden. Sie hat das Originalarchiv vor den veränderten Abschriften getrennt. Ihre letzte Notiz erklärt die Streifen: „Grad und Dezimalminuten. Erst die Breite, dann die Länge.“',
    fragment: { label: 'Koordinatenformat', value: 'Grad + Dezimalminuten' },
    sources: [
      { label: 'Mekong River Commission · Messstationen am Fluss', url: 'https://monitoring.mrcmekong.org/' },
      {
        label: 'Mekong River Commission · Einzugsgebiet und Mündung',
        url: 'https://www.mrcmekong.org/wp-content/uploads/2024/08/Cooperation-for-Water-Energy-and-Food-Security-in-Transboundary-Basins-under-Changing-Climate.pdf',
      },
    ],
    places: [
      place('Luang Prabang', 102.135, 19.89),
      place('Vientiane', 102.63, 17.98),
      place('Pakse', 105.78, 15.12),
      place('Phnom Penh', 104.921, 11.57),
      place('Cần Thơ', 105.786, 10.045),
      place('Bangkok', 100.5, 13.75),
    ],
    labels: [
      place('Laos', 104.1, 19),
      place('Kambodscha', 104.3, 12.8),
      place('Vietnam', 107.3, 11.2),
      place('Thailand', 100.5, 16.5),
      place('Südchinesisches Meer', 107.4, 9.2),
    ],
  },
  {
    id: 'letzte-koordinate',
    title: 'Die letzte Koordinate',
    region: 'Mittelmeer · Malta',
    difficulty: 'Das gesamte Archiv verbinden',
    theme: 'limestone',
    accent: '#d2bf91',
    map: 'malta',
    bounds: [14.15, 35.78, 14.59, 36.08],
    intro:
      'Sieben gelöste Akten, sechs Koordinatenteile und eine Formatangabe. Auf der letzten Karte stehen mehrere Städte. Nur eine verbindet die Position mit der Ortsbeschreibung des Originals.',
    objective:
      'Setze die Koordinaten aus deinen Archivfunden zusammen. Markiere den Treffpunkt und überprüfe den letzten falschen Vermerk.',
    targets: [target('meeting', 'Treffpunkt', 'Mdina', 14.40333, 35.88667, 0.65)],
    evidence: [
      {
        id: 'fragments',
        kind: 'archive',
        label: 'DEIN GESICHERTES ARCHIV',
        title: 'Die sieben Fundstücke',
        text: 'Die sechs Streifen sind nach Breite, Länge und Hemisphäre beschriftet. Die siebte Akte nennt das Format. Ein Grad besteht aus 60 Minuten; Dezimalminuten werden durch 60 geteilt.',
        detail: 'Die Archivfunde aus den abgeschlossenen Fällen stehen unten in dieser Unterlage.',
      },
      {
        id: 'meeting-note',
        kind: 'note',
        label: 'LETZTE NACHRICHT / ORIGINAL',
        title: 'Die stille Stadt',
        text: 'Wir treffen uns innerhalb der Mauern der alten Hauptstadt. Sie liegt auf einem Hügel im Inselinneren, unmittelbar neben Rabat. Nicht am großen Hafen.',
      },
      {
        id: 'valletta-report',
        kind: 'telegram',
        label: 'LETZTER ARCHIVVERMERK',
        title: 'Die bequeme Abkürzung',
        text: 'Die letzte Nachricht nennt eine Hauptstadt. Gemeint ist daher sicher die heutige Hauptstadt Valletta am Hafen. Die Koordinatenstreifen können wir verwerfen.',
      },
      {
        id: 'closing',
        kind: 'telegram',
        label: 'VERSIEGELTER BRIEF',
        title: 'Erst nach der Klärung öffnen',
        text: 'Für die Person, die den richtigen Treffpunkt findet. Der Brief wird nach Abschluss der Ermittlung geöffnet.',
      },
    ],
    proof: ['fragments', 'meeting-note'],
    reject: {
      id: 'valletta-report',
      explanation:
        'Koordinaten und Beschreibung führen nach Mdina im Inselinneren. Valletta ist die heutige Hauptstadt am Hafen und erfüllt beide Belege nicht.',
    },
    hints: [
      'Lege die Streifen zu 35° 53,2′ N und 014° 24,2′ E zusammen. Das Format verwendet Minuten, keine Dezimalgrade.',
      'Dezimalgrad = Grad + Minuten / 60. Die Position liegt ungefähr bei 35,887° N und 14,403° E.',
      'Markiere Mdina neben Rabat. Archivfunde und letzte Nachricht belegen den Ort; der Vermerk über Valletta widerspricht ihnen.',
    ],
    solution:
      '35° 53,2′ N, 014° 24,2′ E ergibt ungefähr 35,8867° N, 14,4033° E. Dort liegt Mdina, die befestigte alte Hauptstadt neben Rabat. Die Koordinaten und die Ortsbeschreibung bestätigen einander.',
    ending:
      'Im Brief liegt der Schlüssel zum Originalarchiv. „Ich musste wissen, dass jemand die Fälschungen erkennt. Du hast keinen Namen erraten. Du hast die Belege geprüft.“ Die Kartografin wartet hinter dem Tor. Die falsche Route ist aufgeklärt.',
    fragment: { label: 'Archiv', value: 'Originale gesichert' },
    sources: [
      {
        label: 'Stadtrat Mdina · Geografie und Geschichte',
        url: 'https://imdinalc.gov.mt/en/homepage/geography-and-history/',
      },
      { label: 'UNESCO · Mdina', url: 'https://whc.unesco.org/en/tentativelists/983/' },
    ],
    places: [
      place('Mdina', 14.403, 35.886),
      place('Rabat', 14.398, 35.88),
      place('Valletta', 14.5146, 35.8989),
      place('Mosta', 14.426, 35.91),
      place('Victoria', 14.24, 36.045),
    ],
    labels: [place('Malta', 14.44, 35.845), place('Gozo', 14.24, 36.065)],
  },
]

// Fixed document order varies by case, so position never reveals a document's reliability.
const DOCUMENT_ORDER = [
  ['bearing', 'water', 'west-report', 'envelope'],
  ['skopje-report', 'baggage', 'border-log', 'transit-note'],
  ['outflow', 'packing', 'nile-report', 'shore'],
  ['longitude', 'archivist', 'flight-log', 'offsets'],
  ['conditions', 'sico-report', 'heights', 'reference'],
  ['ticket', 'peninsula', 'capital-report', 'script-key'],
  ['reverse', 'pagination', 'route-notes', 'basin'],
  ['valletta-report', 'fragments', 'closing', 'meeting-note'],
]
export const INVESTIGATIONS: Investigation[] = CASE_FILES.map((file, index) => ({
  ...file,
  evidence: DOCUMENT_ORDER[index].map((id) => file.evidence.find((item) => item.id === id)!),
}))

export const INVESTIGATION_STORAGE_KEY = 'atlasfunke.story.investigations.v1'
