import { getDatabase } from "@netlify/database";

const db = getDatabase();

const seed = ["San Carlo","Trentina","Locanda","Kabuli","Cylla","Pasture","Ciaro","Asia Asia Food Hall","Takumi"];

async function setup() {
  await db.sql`
    CREATE TABLE IF NOT EXISTS restaurants (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name TEXT NOT NULL,
      visited BOOLEAN NOT NULL DEFAULT FALSE,
      rating INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT rating_between_1_and_5 CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
    )
  `;

  const countResult = await db.sql`SELECT COUNT(*)::int AS count FROM restaurants`;
  if (countResult[0].count === 0) {
    for (const name of seed) {
      await db.sql`INSERT INTO restaurants (name, visited, rating) VALUES (${name}, FALSE, NULL)`;
    }
  }
}

async function allRestaurants() {
  return await db.sql`
    SELECT id, name, visited, COALESCE(rating,0)::int AS rating, created_at
    FROM restaurants
    ORDER BY created_at ASC, id ASC
  `;
}

export default async (req) => {
  try {
    await setup();

    if (req.method === "GET") {
      return Response.json({ restaurants: await allRestaurants() });
    }

    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json();
    const action = body.action;

    if (action === "add") {
      const name = String(body.name || "").trim();
      if (!name) return Response.json({ error: "Restaurant name is required." }, { status: 400 });

      const existing = await db.sql`
        SELECT id FROM restaurants WHERE LOWER(name)=LOWER(${name}) LIMIT 1
      `;
      if (existing.length) {
        return Response.json({ error: "That restaurant is already on your list." }, { status: 409 });
      }

      await db.sql`INSERT INTO restaurants (name, visited, rating) VALUES (${name}, FALSE, NULL)`;
    } else if (action === "visit") {
      const id = Number(body.id);
      if (!Number.isSafeInteger(id)) return Response.json({ error: "Invalid restaurant." }, { status: 400 });
      await db.sql`UPDATE restaurants SET visited=${Boolean(body.visited)} WHERE id=${id}`;
    } else if (action === "rate") {
      const id = Number(body.id);
      const rating = Number(body.rating);
      if (!Number.isSafeInteger(id) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return Response.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
      }
      await db.sql`UPDATE restaurants SET rating=${rating} WHERE id=${id}`;
    } else {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }

    return Response.json({ restaurants: await allRestaurants() });
  } catch (error) {
    console.error("restaurants function error", error);
    return Response.json({ error: "The shared database request failed." }, { status: 500 });
  }
};

export const config = {
  path: "/api/restaurants"
};
