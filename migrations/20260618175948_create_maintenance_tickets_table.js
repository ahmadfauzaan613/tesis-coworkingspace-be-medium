/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('maintenance_tickets', (table) => {
    table.increments('id').primary();
    table.integer('asset_id').unsigned().notNullable();
    table.foreign('asset_id').references('id').inTable('assets').onDelete('CASCADE');
    table.text('issue_description').notNullable();
    table.integer('repair_cost').notNullable().defaultTo(0);
    table.string('vendor_name').nullable();
    table.string('status').notNullable().defaultTo('PENDING'); // PENDING, IN_PROGRESS, RESOLVED
    table.timestamp('resolved_at').nullable();
    table.timestamps(true, true);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('maintenance_tickets');
}
