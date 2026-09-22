const UA = { Accept: 'application/sparql-results+json', 'User-Agent': 'AtlasfunkeImporter/0.1 (data import)' }

export async function sparql(q, attempt = 1) {
  const res = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `query=${encodeURIComponent(q)}`,
  })
  if (!res.ok) {
    if (attempt < 4 && res.status >= 500) {
      await new Promise((r) => setTimeout(r, 4000 * attempt))
      return sparql(q, attempt + 1)
    }
    throw new Error(`Wikidata ${res.status}`)
  }
  return (await res.json()).results.bindings
}

/** Führt eine Abfrage für viele Werte in Batches aus. `build(valuesString)` liefert die Query. */
export async function batched(values, build, size = 100, onProgress) {
  const out = []
  for (let i = 0; i < values.length; i += size) {
    const chunk = values.slice(i, i + size)
    out.push(...(await sparql(build(chunk.join(' ')))))
    onProgress?.(Math.min(i + size, values.length), values.length)
  }
  return out
}

export const qidOf = (uri) => uri.split('/').pop()
