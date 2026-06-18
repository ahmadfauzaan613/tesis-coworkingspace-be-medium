/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Users Table
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username').notNullable().unique();
    table.string('email').notNullable().unique();
    table.string('password').notNullable(); // Hashed password
    table.string('role').notNullable().defaultTo('admin');
    table.timestamps(true, true);
  });

  // 2. Categories Table
  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.text('description').nullable();
    table.timestamps(true, true);
  });

  // 3. Assets Table (Peralatan Coworking Space)
  await knex.schema.createTable('assets', (table) => {
    table.increments('id').primary();
    table.integer('category_id').unsigned().notNullable();
    table.foreign('category_id').references('id').inTable('categories').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('sku').nullable().unique(); // Serial number / barcode
    table.text('description').nullable();
    table.integer('stock').notNullable().defaultTo(0);
    table.string('location').nullable(); // e.g. "Room A", "Main Lobby"
    table.string('status').notNullable().defaultTo('Available'); // e.g. "Available", "Broken", "Maintenance"
    table.timestamps(true, true);

    // Add constraint checking that stock is not negative
    table.check('stock >= 0', [], 'assets_stock_check');
  });

  // 4. Stock History Table (Audit Log)
  await knex.schema.createTable('stock_history', (table) => {
    table.increments('id').primary();
    table.integer('asset_id').unsigned().notNullable();
    table.foreign('asset_id').references('id').inTable('assets').onDelete('CASCADE');
    table.integer('change_qty').notNullable(); // +5 for add, -2 for deduction
    table.string('change_type').notNullable(); // "INITIAL", "ADDITION", "DEDUCTION", "DAMAGE", "AUDIT"
    table.text('remarks').nullable(); // details/notes
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
  await knex.schema.dropTableIfExists('assets');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('users');
}
