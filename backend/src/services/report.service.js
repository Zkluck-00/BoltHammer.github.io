const productRepository = require('../repositories/product.repository');
const saleRepository = require('../repositories/sale.repository');

class ReportService {
  async getReports() {
    const [products, sales] = await Promise.all([
      productRepository.findActive(),
      saleRepository.findNewestFirst()
    ]);

    const productById = new Map(products.map(product => [Number(product.id), product]));
    const totalIncome = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const totalCost = sales.reduce((sum, sale) => {
      return sum + (sale.items || []).reduce((acc, item) => {
        const product = productById.get(Number(item.productId));
        return acc + (Number(product?.buyPrice || 0) * Number(item.qty || 0));
      }, 0);
    }, 0);

    return {
      metrics: {
        totalIncome,
        totalCost,
        estimatedProfit: totalIncome - totalCost,
        salesCount: sales.length,
        productCount: products.length,
        stockValue: products.reduce((sum, product) => sum + Number(product.stock || 0) * Number(product.buyPrice || 0), 0)
      },
      recentSales: sales,
      lowStock: products.filter(product => Number(product.stock) <= Number(product.minStock || 0)),
      topProducts: this.getTopProducts(sales)
    };
  }

  getTopProducts(sales) {
    const byProduct = {};
    for (const sale of sales) {
      for (const item of (sale.items || [])) {
        byProduct[item.name] = (byProduct[item.name] || 0) + Number(item.qty || 0);
      }
    }

    return Object.entries(byProduct)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }
}

module.exports = new ReportService();
