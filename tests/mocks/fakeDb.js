import bcrypt from 'bcryptjs';

// Sentinel value standing in for knex's `db.fn.now()` / `trx.fn.now()`.
const NOW = Symbol('knex.fn.now');

function seedData() {
  const t = (offsetMinutes = 0) => new Date(Date.now() - offsetMinutes * 60000);

  return {
    users: [
      {
        id: 1,
        username: 'admin',
        email: 'admin@coworking.com',
        password: bcrypt.hashSync('admin', 10),
        role: 'admin',
        created_at: t(500),
        updated_at: t(500),
      },
      {
        id: 2,
        username: 'demo',
        email: 'demo@coworking.com',
        password: bcrypt.hashSync('demo', 10),
        role: 'admin',
        created_at: t(500),
        updated_at: t(500),
      },
      {
        id: 3,
        username: 'staffuser',
        email: 'staff@coworking.com',
        password: bcrypt.hashSync('staff123', 10),
        role: 'staff',
        created_at: t(500),
        updated_at: t(500),
      },
    ],
    categories: [
      { id: 1, name: 'Furniture', description: 'Chairs, standing desks, tables, and cabinets', created_at: t(480), updated_at: t(480) },
      { id: 2, name: 'Electronics', description: 'Projectors, televisions, routers, and sound systems', created_at: t(480), updated_at: t(480) },
      { id: 3, name: 'HVAC', description: 'Air conditioners, heaters, and air purifiers', created_at: t(480), updated_at: t(480) },
    ],
    assets: [
      { id: 1, category_id: 1, name: 'Ergonomic Mesh Chair', sku: 'FUR-CHR-001', description: 'Sihoo M57 high-back ergonomic mesh office chair', stock: 45, location: 'Main Desk Area', status: 'Available', created_at: t(460), updated_at: t(460) },
      { id: 2, category_id: 1, name: 'Electric Standing Desk', sku: 'FUR-DSK-002', description: 'Dual-motor height adjustable standing desk 140x70cm', stock: 30, location: 'Main Desk Area', status: 'Available', created_at: t(460), updated_at: t(460) },
      { id: 3, category_id: 2, name: 'Epson HD Projector', sku: 'ELC-PRJ-001', description: 'Epson EB-FH52 Full HD 4000 lumens projector', stock: 3, location: 'Conference Room Alpha', status: 'Available', created_at: t(460), updated_at: t(460) },
      { id: 4, category_id: 3, name: 'Daikin AC Split 1.5 PK', sku: 'HVC-AC-001', description: 'Daikin Inverter split AC 1.5 PK', stock: 8, location: 'Various Rooms', status: 'Available', created_at: t(460), updated_at: t(460) },
    ],
    stock_history: [
      { id: 1, asset_id: 1, change_qty: 45, change_type: 'INITIAL', remarks: 'Initial setup inventory', admin_id: 1, created_at: t(460) },
      { id: 2, asset_id: 2, change_qty: 30, change_type: 'INITIAL', remarks: 'Initial setup inventory', admin_id: 1, created_at: t(460) },
      { id: 3, asset_id: 3, change_qty: 3, change_type: 'INITIAL', remarks: 'Initial setup inventory', admin_id: 1, created_at: t(460) },
      { id: 4, asset_id: 4, change_qty: 8, change_type: 'INITIAL', remarks: 'Initial setup inventory', admin_id: 1, created_at: t(460) },
    ],
    asset_assignments: [],
    maintenance_tickets: [],
  };
}

function parseAliasSpec(spec) {
  const m = /^(.+?)\s+as\s+(.+)$/i.exec(spec.trim());
  if (m) return { col: m[1].trim(), alias: m[2].trim() };
  return { col: spec.trim(), alias: spec.trim() };
}

function splitCol(col) {
  if (col.includes('.')) {
    const [table, c] = col.split('.');
    return { table, c };
  }
  return { table: null, c: col };
}

class QueryBuilder {
  constructor(store, table) {
    this.store = store;
    this.table = table;
    this.wheres = []; // { combinator: 'AND'|'OR', test: (ctx) => bool }
    this.joins = []; // { type: 'inner'|'left', table, localCol, foreignCol }
    this.selects = [];
    this.aggregates = []; // { fn: 'count'|'sum', col, alias }
    this._groupBy = null;
    this._orderBy = null; // { col, dir }
    this._limit = null;
    this._offset = null;
    this._first = false;
    this._forUpdate = false;
    this.action = 'select';
    this._insertData = null;
    this._updateData = null;
    this._returning = false;
  }

  // ---- filtering ----
  _pushWhere(combinator, colOrFn, opOrVal, maybeVal) {
    if (typeof colOrFn === 'function') {
      const group = new QueryBuilder(this.store, this.table);
      colOrFn(group);
      this.wheres.push({ combinator, test: (ctx) => group._evalWheres(ctx) });
      return this;
    }

    let op = '=';
    let val = opOrVal;
    if (maybeVal !== undefined) {
      op = opOrVal;
      val = maybeVal;
    }
    const col = colOrFn;
    this.wheres.push({
      combinator,
      test: (ctx) => {
        const actual = resolveCol(col, ctx, this.table);
        return compare(actual, op, val);
      },
    });
    return this;
  }

  where(colOrFn, opOrVal, maybeVal) {
    return this._pushWhere('AND', colOrFn, opOrVal, maybeVal);
  }

  andWhere(colOrFn, opOrVal, maybeVal) {
    return this._pushWhere('AND', colOrFn, opOrVal, maybeVal);
  }

  orWhere(colOrFn, opOrVal, maybeVal) {
    return this._pushWhere('OR', colOrFn, opOrVal, maybeVal);
  }

  whereIn(col, arr) {
    this.wheres.push({
      combinator: 'AND',
      test: (ctx) => arr.includes(resolveCol(col, ctx, this.table)),
    });
    return this;
  }

  _evalWheres(ctx) {
    let result = true;
    for (const w of this.wheres) {
      if (w.combinator === 'AND') result = result && w.test(ctx);
      else result = result || w.test(ctx);
    }
    return result;
  }

  // ---- joins ----
  join(table, localCol, operator, foreignCol) {
    this.joins.push({ type: 'inner', table, localCol, foreignCol });
    return this;
  }

  leftJoin(table, localCol, operator, foreignCol) {
    this.joins.push({ type: 'left', table, localCol, foreignCol });
    return this;
  }

  // ---- projection ----
  select(...specs) {
    this.selects.push(...specs);
    return this;
  }

  count(spec) {
    const { col, alias } = parseAliasSpec(spec);
    this.aggregates.push({ fn: 'count', col, alias });
    return this;
  }

  sum(spec) {
    const { col, alias } = parseAliasSpec(spec);
    this.aggregates.push({ fn: 'sum', col, alias });
    return this;
  }

  groupBy(col) {
    this._groupBy = col;
    return this;
  }

  orderBy(col, dir = 'asc') {
    this._orderBy = { col, dir };
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  offset(n) {
    this._offset = n;
    return this;
  }

  first() {
    this._first = true;
    return this;
  }

  forUpdate() {
    this._forUpdate = true;
    return this;
  }

  // ---- mutation ----
  insert(data) {
    this.action = 'insert';
    this._insertData = data;
    return this;
  }

  update(data) {
    this.action = 'update';
    this._updateData = data;
    return this;
  }

  del() {
    this.action = 'del';
    return this;
  }

  returning() {
    this._returning = true;
    return this;
  }

  // ---- execution ----
  _buildContexts() {
    let contexts = this.store[this.table].map((row) => ({
      main: row,
      tables: { [this.table]: row },
    }));

    for (const j of this.joins) {
      const next = [];
      for (const ctx of contexts) {
        const candidates = this.store[j.table];
        let matched = false;
        for (const cand of candidates) {
          const trialCtx = { main: ctx.main, tables: { ...ctx.tables, [j.table]: cand } };
          const localVal = resolveCol(j.localCol, trialCtx, this.table);
          const foreignVal = resolveCol(j.foreignCol, trialCtx, this.table);
          // eslint-disable-next-line eqeqeq
          if (localVal == foreignVal) {
            next.push(trialCtx);
            matched = true;
          }
        }
        if (!matched && j.type === 'left') {
          next.push({ main: ctx.main, tables: { ...ctx.tables, [j.table]: null } });
        }
      }
      contexts = next;
    }

    return contexts.filter((ctx) => this._evalWheres(ctx));
  }

  _project(ctx) {
    const out = {};
    const specs = this.selects.length ? this.selects : [`${this.table}.*`];
    for (const spec of specs) {
      const trimmed = spec.trim();
      if (trimmed.endsWith('.*')) {
        const table = trimmed.slice(0, -2);
        const row = ctx.tables[table];
        if (row) Object.assign(out, row);
        continue;
      }
      if (trimmed === '*') {
        Object.assign(out, ctx.main);
        continue;
      }
      const { col, alias } = parseAliasSpec(trimmed);
      const { c } = splitCol(col);
      out[alias === col ? c : alias] = resolveCol(col, ctx, this.table);
    }
    return out;
  }

  async exec() {
    if (this.action === 'insert') {
      const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData];
      const table = this.store[this.table];
      const inserted = rows.map((data) => {
        const nextId = table.reduce((max, r) => Math.max(max, r.id), 0) + 1;
        const now = new Date();
        const row = {
          id: data.id !== undefined ? data.id : nextId,
          ...applyNow(data),
          created_at: applyNowValue(data.created_at) ?? now,
          updated_at: applyNowValue(data.updated_at) ?? now,
        };
        table.push(row);
        return structuredClone(row);
      });
      return inserted;
    }

    if (this.action === 'update') {
      const contexts = this._buildContexts();
      const table = this.store[this.table];
      const updated = [];
      for (const ctx of contexts) {
        const row = table.find((r) => r === ctx.main);
        if (!row) continue;
        Object.assign(row, applyNow(this._updateData));
        updated.push(structuredClone(row));
      }
      return updated;
    }

    if (this.action === 'del') {
      const contexts = this._buildContexts();
      const table = this.store[this.table];
      let deletedCount = 0;
      for (const ctx of contexts) {
        const idx = table.indexOf(ctx.main);
        if (idx !== -1) {
          table.splice(idx, 1);
          deletedCount += 1;
        }
      }
      return deletedCount;
    }

    // ---- select / aggregate ----
    let contexts = this._buildContexts();

    if (this.aggregates.length && this._groupBy) {
      const groups = new Map();
      for (const ctx of contexts) {
        const key = resolveCol(this._groupBy, ctx, this.table);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(ctx);
      }
      let rows = [...groups.values()].map((group) => {
        const out = this._project(group[0]);
        for (const agg of this.aggregates) {
          if (agg.fn === 'count') {
            out[agg.alias] = group.length;
          } else if (agg.fn === 'sum') {
            out[agg.alias] = group.reduce((s, ctx) => s + (Number(resolveCol(agg.col, ctx, this.table)) || 0), 0);
          }
        }
        return out;
      });
      rows = this._applyOrder(rows);
      return rows;
    }

    if (this.aggregates.length) {
      const out = {};
      for (const agg of this.aggregates) {
        if (agg.fn === 'count') out[agg.alias] = contexts.length;
        else if (agg.fn === 'sum') out[agg.alias] = contexts.reduce((s, ctx) => s + (Number(resolveCol(agg.col, ctx, this.table)) || 0), 0);
      }
      return [out];
    }

    let rows = contexts.map((ctx) => this._project(ctx));
    rows = this._applyOrder(rows);

    if (this._offset) rows = rows.slice(this._offset);
    if (this._limit !== null) rows = rows.slice(0, this._limit);

    if (this._first) return rows[0];
    return rows;
  }

  _applyOrder(rows) {
    if (!this._orderBy) return rows;
    const { col, dir } = this._orderBy;
    const { c } = splitCol(col);
    const sorted = [...rows].sort((a, b) => {
      const av = a[c];
      const bv = b[c];
      if (av < bv) return dir === 'desc' ? 1 : -1;
      if (av > bv) return dir === 'desc' ? -1 : 1;
      return 0;
    });
    return sorted;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

function resolveCol(col, ctx, defaultTable) {
  const { table, c } = splitCol(col);
  if (table) {
    const row = ctx.tables[table];
    return row ? row[c] : undefined;
  }
  const mainRow = ctx.tables[defaultTable] || ctx.main;
  return mainRow ? mainRow[c] : undefined;
}

function compare(actual, op, expected) {
  switch (op) {
    case '=':
      // eslint-disable-next-line eqeqeq
      return actual == expected;
    case '!=':
      // eslint-disable-next-line eqeqeq
      return actual != expected;
    case '<':
      return actual < expected;
    case '<=':
      return actual <= expected;
    case '>':
      return actual > expected;
    case '>=':
      return actual >= expected;
    case 'ilike': {
      const pattern = String(expected).replace(/%/g, '').toLowerCase();
      return String(actual ?? '').toLowerCase().includes(pattern);
    }
    default:
      return actual === expected;
  }
}

function applyNowValue(v) {
  return v === NOW ? new Date() : v;
}

function applyNow(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = applyNowValue(v);
  }
  return out;
}

export function createFakeDb() {
  const store = seedData();

  function db(table) {
    if (!store[table]) store[table] = [];
    return new QueryBuilder(store, table);
  }

  db.transaction = async (callback) => {
    return callback(db);
  };

  db.fn = { now: () => NOW };

  db.raw = async () => ({ rows: [] });

  db.__reset = () => {
    const fresh = seedData();
    for (const key of Object.keys(store)) delete store[key];
    Object.assign(store, fresh);
  };

  db.__store = store;

  return db;
}
