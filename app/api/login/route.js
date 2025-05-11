// app/api/login/route.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const { JWT_SECRET } = process.env;

export const POST = async (req) => {
  const { email, password } = await req.json();

  // 1) Look up user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Invalid email or password" }),
      { status: 401 }
    );
  }

  // 2) Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return new Response(
      JSON.stringify({ error: "Invalid email or password" }),
      { status: 401 }
    );
  }

  // 3) Sign a JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  // 4) Return token (and optionally user data without password)
  return new Response(
    JSON.stringify({ token, user: { id: user.id, fullName: user.fullName, email: user.email } }),
    { status: 200 }
  );
};
