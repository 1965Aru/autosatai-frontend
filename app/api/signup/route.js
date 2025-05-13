// app/api/signup/route.js
import connectToDatabase from "@/lib/config/db";
import User              from "@/models/User";

export const POST = async (req) => {
  try {
    // ── 1) Connect to MongoDB ─────────────────────────────────
    await connectToDatabase();

    // ── 2) Parse request body ─────────────────────────────────
    const { fullName, email, password } = await req.json();

    // ── 3) Check for existing user ────────────────────────────
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "User already exists" }),
        { status: 400 }
      );
    }

    // ── 4) Create new user (password is hashed in your pre-save hook) ─
    const newUser = await User.create({ fullName, email, password });

    // ── 5) Return the newly created user ────────────────────────
    return new Response(
      JSON.stringify(newUser),
      { status: 201 }
    );
  } catch (err) {
    // ── 6) Catch-all: always return valid JSON ────────────────
    console.error("Signup error:", err);
    const message = err?.message || "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500 }
    );
  }
};
