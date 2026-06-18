import bcrypt from "bcryptjs";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // Deletes ALL existing entries in dependent order
  await knex("stock_history").del();
  await knex("assets").del();
  await knex("categories").del();
  await knex("users").del();

  // Create initial admin user
  const adminUsername = process.env.SEED_ADMIN_USERNAME;
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  const [admin] = await knex("users")
    .insert({
      id: 1,
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    })
    .returning("*");

  // Create default categories
  await knex("categories").insert([
    {
      id: 1,
      name: "Furniture",
      description: "Chairs, standing desks, tables, and cabinets",
    },
    {
      id: 2,
      name: "Electronics",
      description: "Projectors, televisions, routers, and sound systems",
    },
    {
      id: 3,
      name: "HVAC",
      description: "Air conditioners, heaters, and air purifiers",
    },
  ]);

  // Create default assets
  await knex("assets").insert([
    {
      id: 1,
      category_id: 1, // Furniture
      name: "Ergonomic Mesh Chair",
      sku: "FUR-CHR-001",
      description: "Sihoo M57 high-back ergonomic mesh office chair",
      stock: 45,
      location: "Main Desk Area",
      status: "Available",
    },
    {
      id: 2,
      category_id: 1, // Furniture
      name: "Electric Standing Desk",
      sku: "FUR-DSK-002",
      description: "Dual-motor height adjustable standing desk 140x70cm",
      stock: 30,
      location: "Main Desk Area",
      status: "Available",
    },
    {
      id: 3,
      category_id: 2, // Electronics
      name: "Epson HD Projector",
      sku: "ELC-PRJ-001",
      description: "Epson EB-FH52 Full HD 4000 lumens projector",
      stock: 3,
      location: "Conference Room Alpha",
      status: "Available",
    },
    {
      id: 4,
      category_id: 3, // HVAC
      name: "Daikin AC Split 1.5 PK",
      sku: "HVC-AC-001",
      description: "Daikin Inverter split AC 1.5 PK",
      stock: 8,
      location: "Various Rooms",
      status: "Available",
    },
  ]);

  // Insert initial stock history
  await knex("stock_history").insert([
    {
      asset_id: 1,
      change_qty: 45,
      change_type: "INITIAL",
      remarks: "Initial setup inventory",
      admin_id: admin.id,
    },
    {
      asset_id: 2,
      change_qty: 30,
      change_type: "INITIAL",
      remarks: "Initial setup inventory",
      admin_id: admin.id,
    },
    {
      asset_id: 3,
      change_qty: 3,
      change_type: "INITIAL",
      remarks: "Initial setup inventory",
      admin_id: admin.id,
    },
    {
      asset_id: 4,
      change_qty: 8,
      change_type: "INITIAL",
      remarks: "Initial setup inventory",
      admin_id: admin.id,
    },
  ]);
}
