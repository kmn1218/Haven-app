exports.handler = async function (event, context) {
  const params = event.queryStringParameters || {};
  const city = params.city || "";
  const state = params.state || "";
  const bedroomsMin = parseInt(params.bedroomsMin) || null;
  const priceMax = parseInt(params.priceMax) || null;
  const bathroomsMin = parseInt(params.bathroomsMin) || null;

  try {
    const query = new URLSearchParams();
    query.append("location", `${city}, ${state}`);
    query.append("status_type", "ForSale");
    query.append("home_type", "Houses");
    if (bedroomsMin) query.append("bedsMin", bedroomsMin);
    if (priceMax) query.append("maxPrice", priceMax);
    if (bathroomsMin) query.append("bathsMin", bathroomsMin);

    const url = `https://zillow56.p.rapidapi.com/search?${query.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "zillow56.p.rapidapi.com",
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
      },
    });

    const data = await response.json();

    const raw = data.results || [];
    const listings = raw.slice(0, 6).map(p => ({
      formattedAddress: p.streetAddress || "Address unavailable",
      city: p.city || city,
      state: p.state || state,
      zipCode: p.zipcode || "",
      price: p.price || 0,
      bedrooms: p.bedrooms || null,
      bathrooms: p.bathrooms || null,
      squareFootage: p.livingArea || null,
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
