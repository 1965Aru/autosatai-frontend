// app/api/login/route.js
import connectToDatabase from "@/lib/config/db";
import User              from "@/models/User";
import bcrypt            from "bcryptjs";
import jwt               from "jsonwebtoken";

export const POST = async (req) => {
  try {
    // ── 1) Connect to MongoDB ─────────────────────────────────
    await connectToDatabase();

    // ── 2) Parse request body ─────────────────────────────────
    const { email, password } = await req.json();

    // ── 3) Look up user by email ───────────────────────────────
    const user = await User.findOne({ email });
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401 }
      );
    }

    // ── 4) Compare submitted password to hashed one ─────────────
    //    using instance method if you defined it, or bcrypt.compare:
    const isMatch = await bcrypt.compare(password, user.password);
    // const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401 }
      );
    }

    // ── 5) Sign a JWT ────────────────────────────────────────────
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("Missing JWT_SECRET environment variable");
    }
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      secret,
      { expiresIn: "2h" }
    );

    // ── 6) Success: return token + user info (omit password) ────
    return new Response(
      JSON.stringify({
        token,
        user: {
          id:        user._id.toString(),
          fullName:  user.fullName,
          email:     user.email,
          role:      user.role,
          verified:  user.verified,
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    // ── Catch-all: always return valid JSON ────────────────────
    console.error("Login error:", err);
    const message = err?.message || "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500 }
    );
  }
};
