import { Model } from 'objection';
import bcrypt from 'bcryptjs';

export default class User extends Model {
  static get tableName() {
    return 'users';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['firstName', 'lastName', 'email', 'password'],
      properties: {
        id: { type: 'integer' },
        firstName: { type: 'string', minLength: 1 },
        lastName: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 3 },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    };
  }

  static get relationMappings() {
    return {
      createdTasks: {
        relation: Model.HasManyRelation,
        modelClass: () => import('./Task.js').then(m => m.default),
        join: {
          from: 'users.id',
          to: 'tasks.creatorId',
        },
      },
      executedTasks: {
        relation: Model.HasManyRelation,
        modelClass: () => import('./Task.js').then(m => m.default),
        join: {
          from: 'users.id',
          to: 'tasks.executorId',
        },
      },
    };
  }

  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    this.password = await bcrypt.hash(this.password, 10);
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  async $beforeUpdate(opt, queryContext) {
    await super.$beforeUpdate(opt, queryContext);
    if (this.password && this.password.length < 60) {
      this.password = await bcrypt.hash(this.password, 10);
    }
    this.updatedAt = new Date().toISOString();
  }

  static async verifyPassword(email, password) {
    const user = await this.query().findOne({ email });
    if (!user) return false;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : false;
  }
}