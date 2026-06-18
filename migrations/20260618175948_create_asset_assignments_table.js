/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('asset_assignments', (table) => {
    table.increments('id').primary();
    table.integer('asset_id').unsigned().notNullable();
    table.foreign('asset_id').references('id').inTable('assets').onDelete('CASCADE');
    table.string('assigned_to').notNullable(); // e.g., "Meeting Room 1", "Alice - Staff"
    table.integer('quantity').notNullable().defaultTo(1);
    table.string('status').notNullable().defaultTo('ACTIVE'); // ACTIVE, RETURNED
    table.date('assigned_date').defaultTo(knex.fn.now());
    table.timestamp('returned_at').nullable();
    table.timestamps(true, true);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('asset_assignments');
}
