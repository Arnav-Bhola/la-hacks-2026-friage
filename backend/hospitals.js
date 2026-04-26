async function fetchAllHospitals() {
  const records = []
  let offset = 0

  while (true) {
    const url = `https://data.chhs.ca.gov/api/3/action/datastore_search?resource_id=3ce26934-6cd0-4fb9-8092-4fd96ef4dcbe&limit=100&offset=${offset}`
    const res = await fetch(url)
    const json = await res.json()
    const batch = json.result.records

    records.push(...batch)
    if (batch.length < 100) break
    offset += 100
  }

  return records
}

import fs from 'fs'

const records = await fetchAllHospitals()
fs.writeFileSync('hospitals.json', JSON.stringify(records, null, 2))
console.log(`Saved ${records.length} records`)