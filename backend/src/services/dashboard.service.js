const productRepository = require('../repositories/product.repository');
const saleRepository = require('../repositories/sale.repository');
const clientRepository = require('../repositories/client.repository');
const categoryRepository = require('../repositories/category.repository');

function isToday(dateText) {
  if (!dateText) return false;
  const today = new Date().toISOString().slice(0, 10);
  return String(dateText).slice(0, 10) === today;
}

class DashboardService {
  async getSummary() {
    const [activeProducts, sales, clients, categories] = await Promise.all([
      productRepository.findActive(),
      saleRepository.findNewestFirst(),
      clientRepository.findAll(),
      categoryRepository.findAll()
    ]);

    const lowStock = activeProducts.filter(product => Number(product.stock) <= Number(product.minStock || 0));
    const todaySales = sales.filter(sale => isToday(sale.date));
    const totalToday = todaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const totalStock = activeProducts.reduce((sum, product) => sum + Number(product.stock || 0), 0);

    return {
      metrics: {
        totalToday,
        totalStock,
        lowStockCount: lowStock.length,
        clientsCount: clients.length,
        categoriesCount: categories.length,
        salesCount: sales.length
      },
      lowStock: lowStock.slice(0, 10),
      recentSales: sales.slice(0, 8)
    };
  }
}

module.exports = new DashboardService();
