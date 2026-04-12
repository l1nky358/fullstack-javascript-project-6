import { Model } from 'objection';

export default class TaskLabel extends Model {
  static get tableName() {
    return 'task_labels';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['taskId', 'labelId'],
      properties: {
        id: { type: 'integer' },
        taskId: { type: 'integer' },
        labelId: { type: 'integer' },
        createdAt: { type: 'string' },
      },
    };
  }

  $beforeInsert() {
    this.createdAt = new Date().toISOString();
  }
}