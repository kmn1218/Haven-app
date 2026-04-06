exports.handler = async function (event) {
  const params = event.queryStringParameters || {};

  const city = (params.city || "").trim();
  const state = (params.state || "").trim();
  const bedroomsMin = params.bedroomsMin ? parseFloat(params.bedroomsMin) : null;
  const bathroomsMin = params.bathroomsMin ? parseFloat(params.bathroomsMin) : null;
  const priceMax = params.priceMax ? parseInt(params.priceMax, 10) : null;

  try {
    if (!process.env.RENTCAST_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing RENTCAST_API_KEY" }),
      };
    }

    const query = new URLSearchParams();
    query.append("city", city);
    query.append("state", state);
    query.append("status", "Active");
    query.append("limit", "6");

    if (bedroomsMin !== null) query.append("bedrooms", `${bedroomsMin}+`);
    if (bathroomsMin !== null) query.append("bathrooms", `${bathroomsMin}+`);
    if (priceMax !== null) query.append("price", `0-${priceMax}`);

    const url = `https://api.rentcast.io/v1/listings/sale?${query.toString()}`;

    const response = await fetch(url, {
      headers: {
        "X-Api-Key": process.env.RENTCAST_API_KEY,
      },
    });

    const data = await response.json();

    const listings = (data || []).slice(0, 6).map(p => ({
      formattedAddress: p.formattedAddress || "Address unavailable",
      city: p.city || city,
      state: p.state || state,
      zipCode: p.zipCode || "",
      price: p.price || 0,
      bedrooms: p.bedrooms ?? null,
      bathrooms: p.bathrooms ?? null,
      squareFootage: p.squareFootage ?? null,
      yearBuilt: p.yearBuilt ?? null,
      daysOnMarket: p.daysOnMarket ?? null,
      status: p.status || "Active",
      photoUrls: p.photos?.map(photo => photo.href) || [],
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(listings),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
