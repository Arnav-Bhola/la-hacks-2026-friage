require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const Groq = require('groq-sdk');

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

app.post('/api/analyze-tags', async (req, res) => {
  const { source, tag_definitions } = req.body;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  const credentials = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v2/analysis/${CLOUDINARY_CLOUD_NAME}/analyze/ai_vision_tagging`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({ source, tag_definitions }),
      }
    );

    const data = await response.json();
    if (!response.ok) console.error('Cloudinary error:', response.status, JSON.stringify(data));
    else fs.writeFileSync('dummy_response.json', JSON.stringify(data, null, 2));
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach Cloudinary API' });
  }
});

function buildPatientDescription(tags) {
  const tagSet = new Set(tags.map(t => t.name));
  const parts = [];

  // Wound type (most specific wins)
  if (tagSet.has('gunshot-wound'))      parts.push('gunshot wound present');
  else if (tagSet.has('stab-wound'))    parts.push('stab wound present');
  else if (tagSet.has('avulsion'))      parts.push('avulsion injury');
  else if (tagSet.has('laceration'))    parts.push('laceration present');
  else if (tagSet.has('cut'))           parts.push('minor cut present');
  else if (tagSet.has('abrasion'))      parts.push('abrasion present');
  else if (tagSet.has('puncture-wound')) parts.push('puncture wound present');
  else if (tagSet.has('burn'))          parts.push('burn injury present');

  // Bleeding severity
  if (tagSet.has('hemorrhage'))               parts.push('severe hemorrhage');
  else if (tagSet.has('blood-pooling'))        parts.push('blood pooling at scene');
  else if (tagSet.has('blood-soaked-bandage')) parts.push('bandage fully soaked with blood');
  else if (tagSet.has('bleeding'))             parts.push('active bleeding');
  else if (tagSet.has('blood'))                parts.push('blood visible');

  // Consciousness
  if (tagSet.has('unconscious') || tagSet.has('unresponsive'))
    parts.push('patient unconscious and unresponsive');
  else if (tagSet.has('altered-mental-status') || tagSet.has('confusion'))
    parts.push('patient showing altered mental status');

  // Skin signs
  if (tagSet.has('cyanosis'))     parts.push('cyanosis present — possible airway compromise');
  else if (tagSet.has('pale-skin')) parts.push('patient appears pale');
  if (tagSet.has('diaphoresis'))  parts.push('patient diaphoretic');

  // Body location
  const locations = ['head', 'neck', 'chest', 'abdomen', 'arm', 'leg'].filter(t => tagSet.has(t));
  if (locations.length) parts.push(`injury located on: ${locations.join(', ')}`);

  // Mechanism
  if (tagSet.has('vehicle-collision'))    parts.push('mechanism: vehicle collision');
  else if (tagSet.has('fall-from-height')) parts.push('mechanism: fall from height');

  // Already treated (de-escalates)
  if (tagSet.has('pressure-dressing')) parts.push('pressure dressing already applied');
  if (tagSet.has('splint'))            parts.push('splint in place');
  if (tagSet.has('cervical-collar'))   parts.push('cervical collar applied');

  return parts.length > 0
    ? parts.join('. ') + '.'
    : 'No specific injury indicators detected.';
}

app.post('/api/triage', async (req, res) => {
  const { tags } = req.body;
  const imageDescription = buildPatientDescription(tags);

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a medical triage AI for first responders.
Return ONLY valid JSON. When in doubt, escalate severity.
Use ESI levels 1-5. ESI 1-2 = trauma/emergency, 3 = urgent_care_er, 4 = urgent_care_clinic, 5 = primary_care.`,
        },
        {
          role: 'user',
          content: `Triage this patient: "${imageDescription}"
Return exactly:
{
  "esi_level": <1-5>,
  "severity": <"critical"|"high"|"moderate"|"low"|"minimal">,
  "care_type": <"trauma"|"emergency"|"urgent_care_er"|"urgent_care_clinic"|"primary_care">,
  "specialty": <string>,
  "hospital_search_keyword": <string>,
  "reasoning": <one sentence>,
  "immediate_actions": [<string>],
  "do_not_delay_for": [<string>]
}`,
        },
      ],
    });

    const result = JSON.parse(response.choices[0].message.content);
    res.json(result);
  } catch (err) {
    console.error('Groq error:', err);
    res.status(500).json({ error: 'Triage failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
