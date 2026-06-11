// Writes a prop request to the Notion Prop Requests database
// Environment vars required: NOTION_API_KEY, REQUESTS_DATABASE_ID

exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = process.env.REQUESTS_DATABASE_ID;

  if (!NOTION_API_KEY || !DATABASE_ID) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing environment variables' }) };
  }

  try {
    const { propName, requesterName, email, shootDate, returnDate, notes } = JSON.parse(event.body);

    if (!propName || !requesterName || !email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const properties = {
      Request: { title: [{ text: { content: `${propName} — ${requesterName}` } }] },
      'Requester Name': { rich_text: [{ text: { content: requesterName } }] },
      Email: { email },
      Status: { select: { name: 'New' } },
    };

    if (notes) {
      properties.Notes = { rich_text: [{ text: { content: notes } }] };
    }
    if (shootDate) {
      properties['Shoot Date'] = { date: { start: shootDate } };
    }
    if (returnDate) {
      properties['Return Date'] = { date: { start: returnDate } };
    }

    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: DATABASE_ID },
        properties,
      }),
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
