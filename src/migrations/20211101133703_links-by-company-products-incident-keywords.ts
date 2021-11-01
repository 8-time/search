import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(
    'links-by-company-products-incident-keywords',
    (table) => {
      table.increments();
      table.string('type');
      table.string('link', 2048);
      table.integer('depth');
      table.timestamps(true, true);
    },
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('links-by-company-products-incident-keywords');
}
