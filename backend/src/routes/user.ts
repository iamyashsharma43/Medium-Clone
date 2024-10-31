import { Hono } from "hono";
import { sign } from "hono/jwt";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { signInInput, signUpInput } from "@aayushgupta69/medium-common";

export const userRouter = new Hono<{
	Bindings: {
		DATABASE_URL: string;
		JWT_SECRET: string;
	}
}>();


// Post /api/v1/user/signup - Create a new user
userRouter.post('/signup', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());
	const body = await c.req.json();
	const { success } = signUpInput.safeParse(body);
  if (!success) {
    return c.json({
      message: "Invalid input. Please provide valid input."
    }, 411);
  }
  try {
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: body.password,
        name: body.name,
      }
    });

    const jwt = await sign({
      id: user.id,
    }, c.env.JWT_SECRET);
    return c.json({
      token: jwt,
    }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ message: "An unexpected error occured during signup. Please try again later!" }, 500);
  }
});


// Post /api/v1/user/signin - Sign in a user
userRouter.post('/signin', async (c) => {
  const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());
	const body = await c.req.json();
  const { success } = signInInput.safeParse(body);
  if (!success) {
    return c.json({
      message: "Invalid input. Please provide valid input."
    }, 411);
  }
  try {
    const user = await prisma.user.findFirst({
      where: {
        username: body.username,
        password: body.password,
      }
    });

    if(!user) {
      return c.json({ message: "Invalid username or password!" }, 400);
    }

    const jwt = await sign({
      id: user.id,
    }, c.env.JWT_SECRET);

    return c.json({
      token: jwt,
    }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ message: "An unexpected error occured during signin. Please try again later!" }, 500);
  }
});