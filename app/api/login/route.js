// app/api/login/route.js
import connectToDatabase from "@/lib/config/db";
import User              from "@/models/User";
import bcrypt            from "bcryptjs";
import jwt               from "jsonwebtoken";

export const POST = async (req) => {
  // ensure we’re connected to Mongo
  await connectToDatabase();

  const { email, password } = await req.json();

  // Look up user by email
  const user = await User.findOne({ email });
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Invalid email or password" }),
      { status: 401 }
    );
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return new Response(
      JSON.stringify({ error: "Invalid email or password" }),
      { status: 401 }
    );
  }

  // Sign a JWT
  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  // Return token (and user data without password)
  return new Response(
    JSON.stringify({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email
      }
    }),
    { status: 200 }
  );
};
