/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('stock_history', (table) => {
    table.increments('id').primary();
    table.integer('asset_id').unsigned().notNullable();
    table.foreign('asset_id').references('id').inTable('assets').onDelete('CASCADE');
    table.integer('change_qty').notNullable(); // +5 or -2
    table.string('change_type').notNullable(); // INITIAL, ADDITION, DEDUCTION, DAMAGE, AUDIT
    table.text('remarks').nullable();
    table.integer('admin_id').unsigned().nullable();
    table.foreign('admin_id').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('stock_history');
}
