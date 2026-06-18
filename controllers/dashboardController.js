import db from '../config/db.js';

export const dashboardController = {
  getStats: async (req, res) => {
    // 1. Basic summary counters
    const [totalAssetsResult] = await db('assets').count('id as count');
    const [totalCategoriesResult] = await db('categories').count('id as count');
    const [outOfStockResult] = await db('assets').where('stock', 0).count('id as count');
    const [lowStockResult] = await db('assets').where('stock', '>', 0).andWhere('stock', '<', 5).count('id as count');
    const [brokenResult] = await db('assets').whereIn('status', ['Broken', 'Maintenance']).count('id as count');

    // 2. Category stock breakdown (JOIN + Group By)
    const categoryBreakdown = await db('assets')
      .join('categories', 'assets.category_id', '=', 'categories.id')
      .select('categories.name as category')
      .count('assets.id as unique_items')
      .sum('assets.stock as total_stock')
      .groupBy('categories.name')
      .orderBy('categories.name', 'asc');

    // 3. Active low-stock alerts warning list (< 5 items)
    const lowStockAlerts = await db('assets')
      .join('categories', 'assets.category_id', '=', 'categories.id')
      .select(
        'assets.id',
        'assets.name',
        'assets.sku',
        'assets.stock',
        'assets.location',
        'categories.name as category_name'
      )
      .where('assets.stock', '<', 5)
      .orderBy('assets.stock', 'asc');

    // 4. Last 5 inventory activity audit log items
    const recentActivities = await db('stock_history')
      .join('assets', 'stock_history.asset_id', '=', 'assets.id')
      .leftJoin('users', 'stock_history.admin_id', '=', 'users.id')
      .select(
        'stock_history.id',
        'stock_history.change_qty',
        'stock_history.change_type',
        'stock_history.remarks',
        'stock_history.created_at',
        'assets.name as asset_name',
        'users.username as admin_username'
      )
      .orderBy('stock_history.created_at', 'desc')
      .limit(5);

    // Format sum results which return strings from PostgreSQL
    const formattedCategoryBreakdown = categoryBreakdown.map(item => ({
      category: item.category,
      uniqueItems: parseInt(item.unique_items, 10) || 0,
      totalStock: parseInt(item.total_stock, 10) || 0
    }));

    res.json({
      totalAssets: parseInt(totalAssetsResult.count, 10) || 0,
      totalCategories: parseInt(totalCategoriesResult.count, 10) || 0,
      outOfStock: parseInt(outOfStockResult.count, 10) || 0,
      lowStockCount: parseInt(lowStockResult.count, 10) || 0,
      brokenAssets: parseInt(brokenResult.count, 10) || 0,
      categoryBreakdown: formattedCategoryBreakdown,
      lowStockAlerts,
      recentActivities
    });
  }
};
