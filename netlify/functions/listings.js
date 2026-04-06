exports.handler = async function (event, context) {
  const params = event.queryStringParameters || {};
  const query = new URLSearchParams();
  if (params.city) query.append("city", params.city);
  if (params.state) query.append("state", params.state);
  if (params.bedroomsMin) query.append("bedroomsMin", params.bedroomsMin);
  if (params.priceMax) query.append("priceMax", params.priceMax);
  if (params.bathroomsMin) query.append("bathroomsMin", params.bathroomsMin);
  query.append("status", "Active");
  query.append("limit", "6");

  const url = `https://api.rentcast.io/v1/listings/sale?${query.toString()}`;
  try {
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": process.env.RENTCAST_API_KEY,
        "Accept": "application/json",
      },
    });
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
