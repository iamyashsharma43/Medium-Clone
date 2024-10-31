import { Hono } from "hono";
import { verify } from "hono/jwt";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { createBlogInput, updateBlogInput } from "@aayushgupta69/medium-common";

export const blogRouter = new Hono<{
	Bindings: {
		DATABASE_URL: string;
		JWT_SECRET: string;
	},
  Variables: {
    userId: string;
  }
}>();


// Middleware to verify if the user is authenticated
blogRouter.use('/*', async (c, next) => {
	const authHeader = c.req.header("authorization") || "";
	try {
		const user = await verify(authHeader, c.env.JWT_SECRET);
		if(user){
			c.set("userId", user.id);
			await next();
		}
	} catch (error) {
		return c.json({
			message: "Unauthorized. Please login to access this resource."
		}, 403);
	}
})


// Post /api/v1/blog - Create a new blog
blogRouter.post('/', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());

	const body = await c.req.json();
	const { success } = createBlogInput.safeParse(body);
	if (!success) {
		return c.json({
			message: "Invalid input. Please provide valid input."
		}, 411);
	}
	const authorId = c.get('userId');
	const blog = await prisma.blog.create({
		data: {
			title: body.title,
			content: body.content,
			authorId: Number(authorId)
		}
	});
	
	return c.json({
		id: blog.id,
	}, 201);
});


// Put /api/v1/blog - Update a blog
blogRouter.put('/', async (c) => {
	const prisma = new PrismaClient({
			datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());

	const body = await c.req.json();
	const { success } = updateBlogInput.safeParse(body);
	if (!success) {
		return c.json({
			message: "Invalid input. Please provide valid input."
		}, 411);
	}
	const blog = await prisma.blog.update({
		where: {
			id: body.id,
		},
		data: {
			title: body.title,
			content: body.content,
		}
	});

	return c.json({
		id: blog.id,
	}, 200);
});


// Get /api/v1/blog/bulk - Get all blogs
// Todo: Add pagination
blogRouter.get('/bulk', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());

	const blogs = await prisma.blog.findMany({
		select: {
			id: true,
			title: true,
			content: true,
			author: {
				select: {
					name: true,
				}
			}
		}
	});

	return c.json(blogs, 200);
});


// Get /api/v1/blog/:id - Get a blog by id
blogRouter.get('/:id', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());

	const id = c.req.param("id");
	
	try {
		const blog = await prisma.blog.findUnique({
			where: {
				id: Number(id),
			},
			select: {
				id: true,
				title: true,
				content: true,
				author: {
					select: {
						name: true,
					}
				}
			}
		});

		return c.json(blog, 200);
	} catch (error) {
		return c.json({
			message: "Error while fetching blog. Please try again later."
		}, 411);
	}
});