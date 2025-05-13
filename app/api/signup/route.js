// app/api/signup/route.js
import connectToDatabase from "@/lib/config/db";
import bcrypt            from "bcryptjs";
import User              from "@/models/User";

export const POST = async (req) => {
  // ensure we’re connected to Mongo
  await connectToDatabase();

  // Read JSON data from the request
  const { fullName, email, password } = await req.json();

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return new Response(
      JSON.stringify({ error: "User already exists" }),
      { status: 400 }
    );
  }

  // **NO MANUAL HASHING HERE** — let the model’s pre('save') hook hash it once
  try {
    const newUser = await User.create({
      fullName,
      email,
      password,           // <-- pass the plain password
    });

    return new Response(
      JSON.stringify(newUser),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
};
