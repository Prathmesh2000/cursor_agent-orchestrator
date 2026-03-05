---
name: "api-generator"
description: "Use when creating REST API endpoints, Swagger docs, route handlers, or API schemas. Triggers: \"create endpoint\", \"REST API\", \"Swagger\", \"OpenAPI\", \"POST/GET/PUT/DELETE route\", or any backend API work."
---


# API Generator Skill

Create production-ready REST APIs with validation, error handling, and Swagger documentation.

---

## Stack
Express + Node.js | Joi validation | Sequelize ORM | JWT auth | Swagger/OpenAPI

---

## REST Design Rules

```
Resource URLs (plural nouns):
  GET    /api/users          list all
  POST   /api/users          create
  GET    /api/users/:id      get one
  PUT    /api/users/:id      replace
  PATCH  /api/users/:id      partial update
  DELETE /api/users/:id      delete

Nested:
  GET    /api/users/:id/posts        user's posts
  POST   /api/users/:id/posts        create post for user

❌ Never use verbs: /api/getUser /api/createPost
```

---

## File Structure

```
routes/
  [resource].routes.js       → route definitions
controllers/
  [resource].controller.js   → request handling
services/
  [resource].service.js      → business logic
middleware/
  validate.js                → Joi validation middleware
  auth.js                    → JWT auth middleware
  rateLimiter.js             → rate limiting
```

---

## Route Template

```javascript
// routes/users.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/user.validator');
const UserController = require('../controllers/user.controller');

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, UserController.list);
router.post('/', authenticate, validate(createUserSchema), UserController.create);
router.get('/:id', authenticate, UserController.getOne);
router.patch('/:id', authenticate, validate(updateUserSchema), UserController.update);
router.delete('/:id', authenticate, UserController.remove);

module.exports = router;
```

---

## Controller Template

```javascript
// controllers/user.controller.js
const UserService = require('../services/user.service');
const { successResponse, errorResponse } = require('../utils/response');

class UserController {
  async list(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await UserService.list({ page: +page, limit: +limit });
      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error);
    }
  }

  async create(req, res) {
    try {
      const user = await UserService.create(req.body);
      return successResponse(res, user, 201);
    } catch (error) {
      if (error.name === 'UniqueConstraintError') {
        return errorResponse(res, { message: 'Email already in use', status: 409 });
      }
      return errorResponse(res, error);
    }
  }

  async getOne(req, res) {
    try {
      const user = await UserService.findById(req.params.id);
      if (!user) return errorResponse(res, { message: 'User not found', status: 404 });
      return successResponse(res, user);
    } catch (error) {
      return errorResponse(res, error);
    }
  }
}

module.exports = new UserController();
```

---

## Validation Template (Joi)

```javascript
// validators/user.validator.js
const Joi = require('joi');

const createUserSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(12).required().messages({
    'string.min': 'Password must be at least 12 characters',
    'any.required': 'Password is required'
  }),
  name: Joi.string().min(2).max(100).required()
});

module.exports = { createUserSchema };
```

---

## Standard Response Format

```javascript
// utils/response.js
const successResponse = (res, data, status = 200) => {
  return res.status(status).json({ success: true, data });
};

const errorResponse = (res, error) => {
  const status = error.status || 500;
  const message = error.message || 'Internal server error';
  return res.status(status).json({ success: false, error: message });
};
```

---

## Error Codes

| Code | When |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Validation failed |
| 401 | Auth required |
| 403 | Forbidden (authenticated but no permission) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limit exceeded |
| 500 | Server error |
