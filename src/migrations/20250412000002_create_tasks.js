export async function up(knex) {
  return knex.schema.createTable('tasks', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.integer('statusId').unsigned().notNullable();
    table.integer('creatorId').unsigned().notNullable();
    table.integer('executorId').unsigned().nullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    
    // Внешние ключи
    table.foreign('statusId').references('task_statuses.id').onDelete('RESTRICT');
    table.foreign('creatorId').references('users.id').onDelete('RESTRICT');
    table.foreign('executorId').references('users.id').onDelete('SET NULL');
  });
}

export async function down(knex) {
  return knex.schema.dropTable('tasks');
}