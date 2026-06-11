// Fetches all props from Notion and returns them as JSON
// Environment vars required: NOTION_API_KEY, PROPS_DATABASE_ID

exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = process.env.PROPS_DATABASE_ID;

  if (!NOTION_API_KEY || !DATABASE_ID) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing environment variables' }) };
  }

  try {
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    // Notion returns max 100 per page — loop until done
    while (hasMore) {
      const body = { sorts: [{ property: 'Name', direction: 'ascending' }] };
      if (startCursor) body.start_cursor = startCursor;

      const res = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        return { statusCode: res.status, headers, body: JSON.stringify({ error: err.message }) };
      }

      const data = await res.json();
      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }

    const props = allResults
      .map((page) => ({
        id: page.id,
        name: page.properties.Name?.title?.[0]?.plain_text || '',
        cat: page.properties.Category?.select?.name || '',
        colour: page.properties.Colour?.rich_text?.[0]?.plain_text || '',
        material: page.properties.Material?.rich_text?.[0]?.plain_text || '',
        condition: page.properties.Condition?.select?.name || '',
        loc: page.properties.Location?.select?.name || '',
        status: page.properties.Status?.select?.name || 'Available',
        tags: (page.properties.Tags?.multi_select || []).map((t) => t.name),
        img: page.properties['Photo URL']?.url || '',
        notes: page.properties.Notes?.rich_text?.[0]?.plain_text || '',
      }))
      .filter((p) => p.name); // skip empty rows

    return { statusCode: 200, headers, body: JSON.stringify(props) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
