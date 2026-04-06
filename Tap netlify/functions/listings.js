exports.handler = async function (event, context) {
  const params = event.queryStringParameters || {};
  const city = params.city || "";
  const state = params.state || "";
  const bedroomsMin = params.bedroomsMin || "";
  const priceMax = params.priceMax || "";

  try {
    const query = new URLSearchParams();
    query.append("location", `${city}, ${state}`);
    if (bedroomsMin) query.append("beds_min", bedroomsMin);
    if (priceMax) query.append("price_max", priceMax);
    query.append("home_type", "Houses");
    query.append("status_type", "ForSale");

    const url = `https://zhomes-realty-us.p.rapidapi.com/v2/properties/search?${query.toString()}`;

    const response = await fetch(url, {
      headers: {
        "x-rapidapi-host": "zhomes-realty-us.p.rapidapi.com",
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    const raw = data.props || data.results || data || [];
    const listings = raw.slice(0, 6).map(p => ({
      formattedAddress: p.streetAddress || p.address || "Address unavailable",
      city: p.city || city,
      state: p.state || state,
      zipCode: p.zipcode || p.zip || "",
      price: p.price || p.listPrice || 0,
      bedrooms: p.bedrooms || p.beds || null,
      bathrooms: p.bathrooms || p.baths || null,
      squareFootage: p.livingArea || p.sqft || null,
      yearBuilt: p.yearBuilt || null,
      daysOnMarket: p.daysOnMarket || null,
      status: p.listingStatus || "Active",
      photoUrls: p.imgSrc ? [p.imgSrc] : [],
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
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
