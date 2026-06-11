// Creates a new prop in the Notion Prop Library database
// Environment vars required: NOTION_API_KEY, PROPS_DATABASE_ID, ADMIN_PASSWORD

exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const NOTION_API_KEY  = process.env.NOTION_API_KEY;
  const DATABASE_ID     = process.env.PROPS_DATABASE_ID;
  const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD;

  if (!NOTION_API_KEY || !DATABASE_ID || !ADMIN_PASSWORD) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing environment variables' }) };
  }

  try {
    const { password, name, category, photoUrl, location, status, colour, material, condition, tags, notes } = JSON.parse(event.body);

    // Password check
    if (password !== ADMIN_PASSWORD) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Incorrect password' }) };
    }

    if (!name) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name is required' }) };
    }

    const properties = {
      Name:   { title: [{ text: { content: name } }] },
      Status: { select: { name: status || 'Available' } },
    };

    if (category)  properties.Category  = { select: { name: category } };
    if (photoUrl)  properties['Photo URL'] = { url: photoUrl };
    if (location)  properties.Location   = { select: { name: location } };
    if (condition) properties.Condition  = { select: { name: condition } };
    if (colour)    properties.Colour     = { rich_text: [{ text: { content: colour } }] };
    if (material)  properties.Material   = { rich_text: [{ text: { content: material } }] };
    if (notes)     properties.Notes      = { rich_text: [{ text: { content: notes } }] };

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagList.length) properties.Tags = { multi_select: tagList.map(t => ({ name: t })) };
    }

    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parent: { database_id: DATABASE_ID }, properties }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { statusCode: res.status, headers, body: JSON.stringify({ error: err.message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
