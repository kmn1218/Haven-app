exports.handler = async function (event) {
  const params = event.queryStringParameters || {};

  const city = (params.city || "").trim();
  const state = (params.state || "").trim().toUpperCase();
  const bedroomsMin = params.bedroomsMin ? Number(params.bedroomsMin) : null;
  const bathroomsMin = params.bathroomsMin ? Number(params.bathroomsMin) : null;
  const priceMax = params.priceMax ? Number(params.priceMax) : null;

  const jsonHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    if (!process.env.RENTCAST_API_KEY) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Missing RENTCAST_API_KEY" }),
      };
    }

    if (!city || !state) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "city and state are required" }),
      };
    }

    const query = new URLSearchParams();
    query.append("city", city);
    query.append("state", state);
    query.append("status", "Active");
    query.append("propertyType", "Single Family");
    query.append("limit", "6");

    // RentCast range syntax: min-only = "2:", max-only = ":400000"
    if (bedroomsMin !== null && !Number.isNaN(bedroomsMin)) {
      query.append("bedrooms", `${bedroomsMin}:`);
    }
    if (bathroomsMin !== null && !Number.isNaN(bathroomsMin)) {
      query.append("bathrooms", `${bathroomsMin}:`);
    }
    if (priceMax !== null && !Number.isNaN(priceMax)) {
      query.append("price", `:${priceMax}`);
    }

    const url = `https://api.rentcast.io/v1/listings/sale?${query.toString()}`;
    console.log("RentCast URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Api-Key": process.env.RENTCAST_API_KEY,
      },
    });

    const rawText = await response.text();
    console.log("RentCast status:", response.status);
    console.log("RentCast raw body:", rawText.slice(0, 1000));

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: "RentCast API error",
          status: response.status,
          details: rawText,
        }),
      };
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return {
        statusCode: 502,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: "RentCast returned non-JSON data",
          details: rawText,
        }),
      };
    }

    const rawListings = Array.isArray(data) ? data : [];
    const listings = rawListings.slice(0, 6).map((p) => ({
      id: p.id || null,
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
      photoUrls: Array.isArray(p.photos)
        ? p.photos.map((photo) => photo?.href).filter(Boolean)
        : [],
    }));

    // Return a plain array to match your earlier frontend shape
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify(listings),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: err.message,
        stack: err.stack,
      }),
    };
  }
}
