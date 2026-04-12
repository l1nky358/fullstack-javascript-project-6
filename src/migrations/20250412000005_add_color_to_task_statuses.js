export async function up(knex) {
  return knex.schema.table('task_statuses', (table) => {
    table.string('color').defaultTo('#6c757d');
  });
}

export async function down(knex) {
  return knex.schema.table('task_statuses', (table) => {
    table.dropColumn('color');
  });
}