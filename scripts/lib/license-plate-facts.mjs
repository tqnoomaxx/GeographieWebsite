const corrections = {
  'license_plate:DE-L': {
    name: 'Leipzig',
    districts: ['Leipzig', 'Landkreis Leipzig'],
    region: 'region:DE-SN',
    location: { lat: 51.34, lon: 12.37 },
    source: 'Freistaat Sachsen',
    source_url: 'https://www.medienservice.sachsen.de/medien/medienobjekte/100148/download',
  },
  'license_plate:DE-LF': {
    name: 'Berchtesgadener Land',
    districts: ['Landkreis Berchtesgadener Land', 'Landkreis Traunstein'],
    region: 'region:DE-BY',
    location: { lat: 47.73, lon: 12.88 },
    source: 'Landratsamt Berchtesgadener Land',
    source_url:
      'https://www.lra-bgl.de/t/presse/pressemitteilungen/detail/news/wiedereinfuehrung-altkennzeichen-rei-bgd-und-lf/',
  },
}

export function applyLicensePlateFacts(plates) {
  for (const plate of plates) {
    const correction = corrections[plate.id]
    if (correction) {
      plate.names.de = correction.name
      plate.aliases = [
        ...new Set(correction.districts.flatMap((name) => [name, name.replace(/^Landkreis /, '')])),
      ].filter((name) => name !== correction.name)
      plate.attributes.districts = correction.districts
      plate.attributes.region = correction.region
      plate.location = correction.location
      plate.provenance.fields ??= {}
      plate.provenance.fields.districts = {
        source: correction.source,
        source_url: correction.source_url,
        imported_at: '2026-10-15',
      }
    }
    // BK wird in zwei Bundesländern ausgegeben; beide sind gültig.
    if (plate.id === 'license_plate:DE-BK') {
      plate.attributes.regions = ['region:DE-BW', 'region:DE-ST']
      plate.attributes.districts = ['Landkreis Schwäbisch Hall', 'Landkreis Börde', 'Rems-Murr-Kreis']
      plate.aliases = ['Landkreis Schwäbisch Hall', 'Landkreis Börde', 'Börde', 'Rems-Murr-Kreis']
      plate.provenance.fields ??= {}
      plate.provenance.fields.regions = {
        source: 'Landkreis Börde',
        source_url: 'https://www.landkreis-boerde.de/landkreis/ueber-den-landkreis/staedte-und-gemeinden',
        imported_at: '2026-10-15',
      }
      plate.provenance.fields['districts.Rems-Murr-Kreis'] = {
        source: 'Rems-Murr-Kreis',
        source_url: 'https://www.rems-murr-kreis.de/bauen-umwelt-und-verkehr/kfz-zulassung/wunschkennzeichen',
        imported_at: '2026-10-15',
      }
    }
  }
}
