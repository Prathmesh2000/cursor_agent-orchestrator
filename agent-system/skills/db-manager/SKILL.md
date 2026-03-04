---
name: db-manager
description: Use for PostgreSQL schema design, Sequelize models, migrations, queries, and database optimization. Triggers: "database", "schema", "migration", "Sequelize", "query", "SQL", "model", or any data persistence work.
---

# Database Manager Skill

Design schemas, build Sequelize models, write migrations, and optimize queries for PostgreSQL.

---

## Stack
PostgreSQL | Sequelize ORM | UUID primary keys | Paranoid (soft delete)

---

## Schema Design Rules

1. **Normalize to 3NF** — no duplicated data across tables
2. **UUID primary keys** — not serial integers
3. **Timestamps** — always `createdAt`, `updatedAt`, `deletedAt` (paranoid)
4. **Index** — all foreign keys + columns used in WHERE/ORDER BY
5. **Constraints** — NOT NULL, UNIQUE, CHECK at DB level, not just app level
6. **Naming** — snake_case in DB, camelCase in Sequelize

---

## Sequelize Model Template

```javascript
// models/User.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    paranoid: true,          // enables soft delete (deletedAt)
    underscored: true,       // snake_case column names in DB
    indexes: [
      { fields: ['email'] },
      { fields: ['is_active'] }
    ]
  });

  User.associate = (models) => {
    User.hasMany(models.Post, { foreignKey: 'userId', as: 'posts' });
    User.belongsToMany(models.Role, { through: models.UserRole, as: 'roles' });
  };

  return User;
};
```

---

## Migration Template

```javascript
// migrations/YYYYMMDDHHMMSS-create-users.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  }
};
```

---

## Common Relationships

```javascript
// One-to-Many
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// Many-to-Many (through table)
User.belongsToMany(Role, { through: UserRole, foreignKey: 'userId', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'roleId', as: 'users' });

// One-to-One
User.hasOne(Profile, { foreignKey: 'userId', as: 'profile' });
Profile.belongsTo(User, { foreignKey: 'userId' });
```

---

## Query Patterns

```javascript
// Paginated list with includes
const users = await User.findAndCountAll({
  where: { isActive: true },
  include: [{ model: Post, as: 'posts', required: false }],
  order: [['createdAt', 'DESC']],
  limit: parseInt(limit),
  offset: (page - 1) * limit,
  distinct: true  // required with includes for accurate count
});

// Safe upsert
const [user, created] = await User.findOrCreate({
  where: { email },
  defaults: { name, passwordHash }
});

// Transaction
const result = await sequelize.transaction(async (t) => {
  const user = await User.create({ email }, { transaction: t });
  const profile = await Profile.create({ userId: user.id }, { transaction: t });
  return { user, profile };
});
```

---

## Performance Checklist

- [ ] Foreign key indexes exist
- [ ] Columns in WHERE clauses are indexed
- [ ] `EXPLAIN ANALYZE` run on slow queries
- [ ] N+1 queries avoided (use `include` not loops)
- [ ] `distinct: true` used with findAndCountAll + includes
- [ ] Pagination on all list endpoints (no unbounded queries)
- [ ] Large text fields (JSON, TEXT) excluded from list queries with `attributes`
