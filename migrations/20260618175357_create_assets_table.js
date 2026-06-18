/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('assets', (table) => {
    table.increments('id').primary();
    table.integer('category_id').unsigned().notNullable();
    table.foreign('category_id').references('id').inTable('categories').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('sku').nullable().unique(); // Serial number
    table.text('description').nullable();
    table.integer('stock').notNullable().defaultTo(0);
    table.string('location').nullable();
    table.string('status').notNullable().defaultTo('Available'); // Available, Broken, Maintenance
    table.timestamps(true, true);

    // Enforce check constraint that stock is not negative
    table.check('stock >= 0', [], 'assets_stock_check');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('assets');
}
