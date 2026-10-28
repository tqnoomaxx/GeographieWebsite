import type { PlayStationId } from '@/features/play/stationProgress'

export type StoryTask = {
  prompt: string
  choices: readonly string[]
  answer: number
  hint: string
  explanation: string
  flag?: string
}

export type StoryChapter = {
  id: string
  station: PlayStationId
  place: string
  title: string
  description: string
  dialogue: string
  goal: string
  artifact: string
  artifactDescription: string
  ending: string
  tasks: readonly StoryTask[]
}

export const STORY_CHAPTERS: readonly StoryChapter[] = [
  {
    id: 'ankunft',
    station: 'water',
    place: 'Die Ankunft',
    title: 'Eine Flasche im Sand',
    description:
      'Die Brandung trägt eine Flaschenpost an den Strand. Darin: eine zerrissene Karte und eine Nachricht von Mira, der Kartografin der Windinsel.',
    dialogue:
      'Da bist du ja. Der Sturm hat unsere Karten in alle Winde getragen. Hilfst du mir, die Insel wiederzufinden?',
    goal: 'Orientiere dich am Strand und finde den Weg ins Inselinnere.',
    artifact: 'Miras Kompass',
    artifactDescription:
      'Die Nadel zittert kurz. Dann zeigt sie verlässlich nach Norden. Jede Reise braucht einen Anfang.',
    ending:
      'Unter dem Treibholz liegt Miras Kompass. Seine Nadel weist auf das alte Kartenhaus. Zum ersten Mal seit dem Sturm weiß Mira, wohin es weitergeht.',
    tasks: [
      {
        prompt: 'Die Sonne steigt über dem Meer auf. In welche Himmelsrichtung blickst du?',
        choices: ['Nach Norden', 'Nach Osten', 'Nach Westen'],
        answer: 1,
        hint: 'Denke an den Spruch: Im Osten geht die Sonne auf.',
        explanation:
          'Die Sonne geht im Osten auf. Mit diesem ersten Anhaltspunkt kannst du dich auch ohne Karte orientieren.',
      },
      {
        prompt: 'Die Flaschenpost sagt: „Gehe entgegen der aufgehenden Sonne.“ Welchen Kurs nimmst du?',
        choices: ['Westen', 'Süden', 'Osten'],
        answer: 0,
        hint: 'Gesucht ist die Richtung, die Osten gegenüberliegt.',
        explanation: 'Westen liegt Osten gegenüber. Zwischen den Dünen taucht ein Wegweiser auf.',
      },
      {
        prompt: 'Auf dem Wegweiser steht: „Nördlicher Nachbar Deutschlands“. Welches Land ist gemeint?',
        choices: ['Italien', 'Portugal', 'Dänemark'],
        answer: 2,
        hint: 'Dieses Land grenzt an Schleswig-Holstein.',
        explanation:
          'Dänemark grenzt im Norden an Deutschland. Am Fuß des Wegweisers glitzert etwas im Sand …',
      },
    ],
  },
  {
    id: 'kartenhaus',
    station: 'countries',
    place: 'Das Kartenhaus',
    title: 'Eine Welt aus Teilen',
    description:
      'Im Kartenhaus wirbeln leere Atlasblätter durch die Luft. Nur drei beschriftete Fragmente haben den Sturm überstanden.',
    dialogue:
      'Mein Großvater nannte ihn den Atlas der Winde. Er zeigt Wege zwischen Orten – aber nur, wenn wir verstehen, was sie verbindet.',
    goal: 'Ordne die Kartenfragmente wieder ihrer Weltregion zu.',
    artifact: 'Das erste Atlasblatt',
    artifactDescription:
      'Kontinente und Ozeane zeichnen sich auf dem Papier ab. Am Rand leuchten drei kleine Signale.',
    ending:
      'Die Fragmente fügen sich zu einer Weltkarte. Am östlichen Inselhügel beginnen drei Fahnen zu flattern. Jemand versucht, euch etwas mitzuteilen.',
    tasks: [
      {
        prompt: 'Auf dem ersten Fragment steht „Brasilien“. Auf welchen Kontinent gehört es?',
        choices: ['Afrika', 'Südamerika', 'Europa'],
        answer: 1,
        hint: 'Dort fließt ein großer Teil des Amazonas.',
        explanation: 'Brasilien liegt in Südamerika. Das erste Fragment findet seinen Platz.',
      },
      {
        prompt: 'Das zweite Fragment zeigt Indien. In welcher Weltregion suchst du?',
        choices: ['Asien', 'Europa', 'Ozeanien'],
        answer: 0,
        hint: 'Nördlich von Indien erhebt sich der Himalaya.',
        explanation: 'Indien liegt in Asien. Auf der Karte erscheint die Form des indischen Subkontinents.',
      },
      {
        prompt: 'Die größte blaue Fläche fehlt noch. Welcher Ozean ist der größte der Erde?',
        choices: ['Atlantischer Ozean', 'Indischer Ozean', 'Pazifischer Ozean'],
        answer: 2,
        hint: 'Er erstreckt sich zwischen Asien, Ozeanien und Amerika.',
        explanation: 'Der Pazifik ist der größte Ozean. Die Weltkarte ist wieder lesbar.',
      },
    ],
  },
  {
    id: 'signale',
    station: 'flags',
    place: 'Der Signalhügel',
    title: 'Die stummen Signale',
    description:
      'Auf dem Hügel hängen drei Fahnen. Unter jeder verbirgt sich ein Buchstabe. Nur wer die Länder erkennt, kann die Nachricht lesen.',
    dialogue:
      'Vor dem Sturm schickten Reisende ihre Geschichten hierher. Vielleicht haben ihre Fahnen auch die Erinnerung an den Atlas bewahrt.',
    goal: 'Entschlüssle die drei Ländersignale.',
    artifact: 'Das Signalband',
    artifactDescription: 'Drei Fahnen, eine Nachricht: „Suche die Stadt am Fluss.“',
    ending:
      'Die Fahnen geben ihre Nachricht preis: „Suche die Stadt am Fluss.“ Mira entdeckt auf dem Atlas eine winzige Kuppel. Dort muss der nächste Hinweis liegen.',
    tasks: [
      {
        prompt: 'Die erste Fahne flattert über dem Weg. Zu welchem Land gehört sie?',
        flag: 'DE',
        choices: ['Belgien', 'Deutschland', 'Österreich'],
        answer: 1,
        hint: 'Die waagerechten Streifen sind Schwarz, Rot und Gold.',
        explanation: 'Das ist die Flagge Deutschlands. Der erste Buchstabe der Nachricht wird sichtbar.',
      },
      {
        prompt: 'Ein roter Kreis auf weißem Grund: Welches Land sendet das zweite Signal?',
        flag: 'JP',
        choices: ['Japan', 'Kanada', 'Dänemark'],
        answer: 0,
        hint: 'Der Kreis stellt die Sonne dar.',
        explanation: 'Die Flagge gehört zu Japan. Das Land liegt vor der Ostküste Asiens.',
      },
      {
        prompt: 'Grün, Gelb und eine blaue Kugel. Welches Land erkennst du auf der letzten Fahne?',
        flag: 'BR',
        choices: ['Schweden', 'Argentinien', 'Brasilien'],
        answer: 2,
        hint: 'Dorthin hast du bereits eines der Kartenfragmente gelegt.',
        explanation: 'Das ist Brasiliens Flagge. Die drei Signale ergeben nun eine lesbare Botschaft.',
      },
    ],
  },
  {
    id: 'flussstadt',
    station: 'capitals',
    place: 'Die Flussstadt',
    title: 'Die Stadt ohne Namen',
    description:
      'An der Kuppelhalle endet der Weg. Auf der Tür stehen drei Reisebeschreibungen, doch die Namen der Städte hat der Regen ausgewaschen.',
    dialogue:
      'Eine Stadt ist mehr als ein Punkt auf der Karte. Flüsse, Menschen und Geschichten machen sie unverwechselbar. Welche Spuren erkennst du?',
    goal: 'Gib den drei Reisen ihre Hauptstädte zurück.',
    artifact: 'Der Stadtschlüssel',
    artifactDescription:
      'Ein kleiner Messingschlüssel. In seinen Bart ist die Silhouette eines steinernen Tores geschnitten.',
    ending:
      'Das Schloss klickt. Hinter der Tür liegt ein Schlüssel mit einem steinernen Tor als Griff. Auf seiner Rückseite steht: „Erinnerung wohnt im Stein.“',
    tasks: [
      {
        prompt: '„Meine Reise beginnt in Portugal, in der Hauptstadt am Tejo.“ Welche Stadt ist gesucht?',
        choices: ['Madrid', 'Rom', 'Lissabon'],
        answer: 2,
        hint: 'Madrid ist Spaniens Hauptstadt; Rom liegt in Italien.',
        explanation: 'Lissabon ist Portugals Hauptstadt und liegt an der Mündung des Tejo.',
      },
      {
        prompt: '„Dann folge ich der Seine durch Frankreichs Hauptstadt.“ Wohin führt die Reise?',
        choices: ['Paris', 'Lyon', 'Brüssel'],
        answer: 0,
        hint: 'In dieser Stadt steht auch der Eiffelturm.',
        explanation: 'Die Seine fließt durch Paris. Der zweite Stadtname kehrt auf die Tür zurück.',
      },
      {
        prompt: '„Zuletzt besuche ich Australiens Hauptstadt.“ Welchen Namen schreibst du auf?',
        choices: ['Sydney', 'Canberra', 'Melbourne'],
        answer: 1,
        hint: 'Die Hauptstadt ist weder Sydney noch Melbourne.',
        explanation: 'Canberra ist die Hauptstadt Australiens. Alle drei Namen sind wieder an ihrem Platz.',
      },
    ],
  },
  {
    id: 'steintor',
    station: 'landmarks',
    place: 'Das alte Steintor',
    title: 'Spuren im alten Stein',
    description:
      'Der Schlüssel passt in das Steintor. Dahinter leuchten Reliefs von drei Bauwerken. Ihre Herkunft weist den Weg zur Inselbibliothek.',
    dialogue:
      'Diese Orte haben Jahrhunderte überdauert. Wenn der Atlas Erinnerungen sammelt, müssen ihre Geschichten ein Teil davon sein.',
    goal: 'Verbinde die Bauwerke mit ihren Herkunftsländern.',
    artifact: 'Die Erinnerungsscherbe',
    artifactDescription: 'Im glatten Stein spiegeln sich eine Kuppel, eine Bergstadt und drei Pyramiden.',
    ending:
      'Die Reliefs erwachen. Ein schmaler Lichtstrahl fällt auf die Bibliothek. Ihr findet eine Steinscherbe mit einer Inschrift, die Mira nicht lesen kann.',
    tasks: [
      {
        prompt: 'Das erste Relief zeigt das Taj Mahal. In welchem Land steht es?',
        choices: ['Indien', 'Thailand', 'Türkei'],
        answer: 0,
        hint: 'Es steht in Agra, südlich von Neu-Delhi.',
        explanation:
          'Das Taj Mahal steht in Agra in Indien. Seine weiße Marmorkuppel wird im Relief sichtbar.',
      },
      {
        prompt: 'Hoch in den Anden liegt Machu Picchu. Welches Land gehört zu diesem Relief?',
        choices: ['Mexiko', 'Spanien', 'Peru'],
        answer: 2,
        hint: 'Gesucht ist ein Land an der Westküste Südamerikas.',
        explanation:
          'Machu Picchu liegt in Peru. Die ehemalige Inkastadt wurde auf einem Bergrücken errichtet.',
      },
      {
        prompt: 'Das letzte Relief zeigt die Pyramiden von Gizeh. Wohin führt diese Spur?',
        choices: ['Griechenland', 'Ägypten', 'Marokko'],
        answer: 1,
        hint: 'Ganz in der Nähe liegt Kairo.',
        explanation:
          'Die Pyramiden von Gizeh stehen in Ägypten. Alle drei Erinnerungen haben ihren Ort wiedergefunden.',
      },
    ],
  },
  {
    id: 'bibliothek',
    station: 'languages',
    place: 'Die Inselbibliothek',
    title: 'Worte, die Wege öffnen',
    description:
      'Zwischen umgestürzten Regalen liegt das Reisetagebuch von Miras Großvater. Drei Grußbotschaften verbergen den Code zum letzten Atlasblatt.',
    dialogue:
      'Er sagte immer: Mit jedem neuen Wort wird die Welt ein bisschen größer. Lass uns hören, was uns diese Reisenden zu erzählen haben.',
    goal: 'Folge den sprachlichen Spuren im Reisetagebuch.',
    artifact: 'Das Wörterband',
    artifactDescription:
      'Ein Lesezeichen mit Grüßen aus aller Welt. Darunter steht: „Den letzten Weg kennt der Wind.“',
    ending:
      'Zwischen den Seiten löst sich ein Lesezeichen. Der Code öffnet eine Schublade: Darin liegt eine Höhenkarte. Ihr Weg führt über die Berge.',
    tasks: [
      {
        prompt: 'Ein Reisender aus Brasilien schreibt „bom dia“. Welche Sprache verwendet er?',
        choices: ['Spanisch', 'Portugiesisch', 'Italienisch'],
        answer: 1,
        hint: 'Die Sprache kam aus Portugal nach Brasilien.',
        explanation:
          '„Bom dia“ bedeutet auf Portugiesisch „Guten Morgen“. Portugiesisch ist Brasiliens Amtssprache.',
      },
      {
        prompt: 'Auf einer Karte aus Mexiko steht „buenos días“. Welche Sprache ist das?',
        choices: ['Spanisch', 'Deutsch', 'Schwedisch'],
        answer: 0,
        hint: 'Diese Sprache wird auch in Madrid gesprochen.',
        explanation: '„Buenos días“ ist Spanisch. Spanisch ist die am weitesten verbreitete Sprache Mexikos.',
      },
      {
        prompt: 'Der letzte Gruß lautet „καλημέρα“. Welche Schrift erkennst du?',
        choices: ['Kyrillisch', 'Arabisch', 'Griechisch'],
        answer: 2,
        hint: 'Denk an die Buchstaben Alpha, Beta und Gamma.',
        explanation:
          'Das ist griechische Schrift. „Kaliméra“ heißt „Guten Morgen“. Der Code ist vollständig.',
      },
    ],
  },
  {
    id: 'gipfel',
    station: 'nature',
    place: 'Der Wolkenpass',
    title: 'Über den Wolken',
    description:
      'Der Pfad wird schmaler. Wolken ziehen durch die Gipfel, und der Wind trägt einzelne Atlasblätter mit sich. Drei Naturspuren weisen zum Pass.',
    dialogue:
      'Von hier oben sieht die Insel ganz anders aus. Vielleicht ging es meinem Großvater genau darum: die Welt aus einer neuen Richtung zu betrachten.',
    goal: 'Lies die Landschaft und erreiche den Wolkenpass.',
    artifact: 'Die Windfeder',
    artifactDescription: 'Eine silberne Feder, die selbst im stärksten Wind ruhig in deiner Hand liegt.',
    ending:
      'Am Pass wartet eine Feder in einer windstillen Mulde. Als Mira sie berührt, senkt sich der alte Reiseballon zur Insel herab. Es fehlt nur noch ein letzter Weg.',
    tasks: [
      {
        prompt: 'Der erste Stein trägt den Namen „Alpen“. Auf welchem Kontinent liegt dieses Gebirge?',
        choices: ['Asien', 'Südamerika', 'Europa'],
        answer: 2,
        hint: 'Die Alpen erstrecken sich unter anderem durch Österreich und die Schweiz.',
        explanation: 'Die Alpen liegen in Europa. Der erste Abschnitt des Höhenpfads wird sichtbar.',
      },
      {
        prompt: 'Eine blaue Linie auf der Höhenkarte ist mit „Nil“ beschriftet. In welches Meer mündet er?',
        choices: ['Mittelmeer', 'Rotes Meer', 'Schwarzes Meer'],
        answer: 0,
        hint: 'Folge dem Fluss durch Ägypten nach Norden.',
        explanation:
          'Der Nil mündet im Norden Ägyptens ins Mittelmeer. Wasser verbindet selbst weit entfernte Landschaften.',
      },
      {
        prompt:
          'Am letzten Wegstein steht „Mount Everest“. Zu welchem Gebirge gehört der höchste Berg der Erde?',
        choices: ['Anden', 'Himalaya', 'Alpen'],
        answer: 1,
        hint: 'Dieses Gebirge liegt nördlich von Indien.',
        explanation: 'Der Mount Everest gehört zum Himalaya. Ihr habt den Wolkenpass erreicht.',
      },
    ],
  },
  {
    id: 'aufbruch',
    station: 'daily',
    place: 'Die Sternwarte',
    title: 'Wenn der Atlas erwacht',
    description:
      'An der alten Sternwarte wartet der Reiseballon. In seinem Korb liegen eure Fundstücke nebeneinander. Für die letzte Atlas-Seite müsst ihr eure Spuren verbinden.',
    dialogue:
      'Wir haben keine verlorene Insel gefunden. Wir haben gelernt, sie zu lesen. Jetzt bestimmst du den Kurs. Bereit für unseren letzten Aufbruch?',
    goal: 'Verbinde, was du auf deiner Reise entdeckt hast.',
    artifact: 'Der Atlas der Winde',
    artifactDescription:
      'Alle acht Fundstücke sind vereint. Der Atlas zeigt keine fertigen Wege mehr, sondern Raum für deine nächsten Entdeckungen.',
    ending:
      'Die Seiten schlagen von selbst um. Küsten, Städte und Berge leuchten auf. „Ein Atlas ist niemals fertig“, sagt Mira. „Solange wir neugierig bleiben, gibt es einen nächsten Weg.“ Der Ballon steigt auf. Unter euch liegt die Windinsel – und vor euch die ganze Welt.',
    tasks: [
      {
        prompt:
          'Euer erster Kurs führt von Lissabon hinaus aufs Meer. Welcher Ozean liegt vor Portugals Küste?',
        choices: ['Indischer Ozean', 'Pazifischer Ozean', 'Atlantischer Ozean'],
        answer: 2,
        hint: 'Portugal liegt am westlichen Rand Europas.',
        explanation: 'Portugal liegt am Atlantik. Eure erste große Überfahrt beginnt.',
      },
      {
        prompt:
          'Auf der nächsten Route verbindet ihr Peru mit Japan. Welchen Ozean überquert ihr auf direktem Weg?',
        choices: ['Pazifischer Ozean', 'Atlantischer Ozean', 'Arktischer Ozean'],
        answer: 0,
        hint: 'Dieser Ozean ist dir im Kartenhaus schon begegnet.',
        explanation:
          'Zwischen der Westküste Südamerikas und Japan liegt der Pazifik. Die Hinweise fügen sich zusammen.',
      },
      {
        prompt:
          'Ein neuer Tag beginnt. Der Ballon fliegt der aufgehenden Sonne entgegen. Welchen Kurs zeigt Miras Kompass?',
        choices: ['Westen', 'Osten', 'Süden'],
        answer: 1,
        hint: 'Erinnere dich an deinen allerersten Morgen am Strand.',
        explanation:
          'Osten. Deine Reise endet mit der Richtung, in der sie begann. Der Atlas der Winde erwacht.',
      },
    ],
  },
]
