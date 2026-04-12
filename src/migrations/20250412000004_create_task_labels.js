export async function up(knex) {
  return knex.schema.createTable('task_labels', (table) => {
    table.increments('id').primary();
    table.integer('taskId').unsigned().notNullable();
    table.integer('labelId').unsigned().notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    
    table.foreign('taskId').references('tasks.id').onDelete('CASCADE');
    table.foreign('labelId').references('labels.id').onDelete('RESTRICT');
    table.unique(['taskId', 'labelId']);
  });
}

export async function down(knex) {
  return knex.schema.dropTable('task_labels');
}