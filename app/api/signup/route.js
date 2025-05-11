import { PrismaClient } from '@prisma/client'; // Import Prisma Client
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const POST = async (req) => {
  // Read JSON data from the request
  const { fullName, email, password } = await req.json();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return new Response(
      JSON.stringify({ error: 'User already exists' }),
      { status: 400 }
    );
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the user in the database
  try {
    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
      },
    });

    return new Response(
      JSON.stringify(newUser),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
