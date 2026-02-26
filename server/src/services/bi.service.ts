import prisma from '../config/prisma.js';
import { toEpoch, serializeBigInt } from '../utils/time.js';
import dayjs from 'dayjs';

export class BIService {
  static async calculateCommissions(employeeId: string, startDate: Date | number, endDate: Date | number, commissionRate: number = 0.05) {
    const sales = await prisma.sale.findMany({
      where: {
        employeeId,
        timestamp: {
          gte: BigInt(toEpoch(startDate)),
          lte: BigInt(toEpoch(endDate)),
        },
      },
    });

    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const commissionAmount = totalSales * commissionRate;

    return {
      totalSales,
      commissionAmount,
      count: sales.length,
    };
  }

  static async getLaborAnalytics() {
    // Total Sales / Total Hours Worked
    const allSales = await prisma.sale.findMany();
    const totalSales = allSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

    const allAttendance = await prisma.attendance.findMany({
      where: { clockOutTimestamp: { not: null } },
    });

    const totalHours = allAttendance.reduce((sum, log) => {
      const duration = (Number(log.clockOutTimestamp!) - Number(log.clockInTimestamp)) / (1000 * 60 * 60);
      return sum + duration;
    }, 0);

    return {
      totalSales,
      totalHours,
      salesPerManHour: totalHours > 0 ? totalSales / totalHours : 0,
    };
  }

  static async generatePayroll(employeeId: string, month: number, year: number) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw new Error('Employee not found');

    const startMonth = dayjs().year(year).month(month).startOf('month');
    const endMonth = dayjs().year(year).month(month).endOf('month');

    // 1. Base Pay
    const basePay = Number(employee.salary);

    // 2. Commissions (assume 5% for now)
    const commissions = await this.calculateCommissions(employeeId, startMonth.valueOf(), endMonth.valueOf());

    // 3. Deductions for Unpaid Leaves
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        startTimestamp: { gte: BigInt(startMonth.valueOf()) },
        endTimestamp: { lte: BigInt(endMonth.valueOf()) },
        type: 'UNPAID',
      },
    });
    const unpaidDays = leaves.reduce((sum, leave) => {
      const s = dayjs(Number(leave.startTimestamp)).startOf('day');
      const e = dayjs(Number(leave.endTimestamp)).startOf('day');
      const days = e.diff(s, 'day') + 1;
      return sum + days;
    }, 0);

    const dailyRate = basePay / 30; // Simplified
    const deductions = unpaidDays * dailyRate;

    const netSalary = basePay + commissions.commissionAmount - deductions;

    return {
      employeeName: employee.name,
      basePay,
      commissions: commissions.commissionAmount,
      deductions,
      netSalary,
      unpaidDays,
    };
  }

  static async getDashboardAnalytics(startDate?: string, endDate?: string) {
    const now = dayjs();
    const startOfWeek = now.startOf('week').valueOf();
    const startOfMonth = now.startOf('month').valueOf();
    const todayStart = now.startOf('day').valueOf();

    // Custom range or default 7 days
    const rangeEnd = (endDate && dayjs(endDate).isValid()) ? dayjs(endDate).endOf('day') : now;
    const rangeStart = (startDate && dayjs(startDate).isValid()) ? dayjs(startDate).startOf('day') : rangeEnd.subtract(6, 'day').startOf('day');

    if (!rangeStart.isValid() || !rangeEnd.isValid()) {
      throw new Error(`Invalid date range: ${startDate} to ${endDate}`);
    }

    const diffDays = Math.max(1, rangeEnd.diff(rangeStart, 'day') + 1);
    const daysArray = Array.from({ length: diffDays }, (_, i) => rangeStart.add(i, 'day').format('YYYY-MM-DD'));

    // 1. Revenue Totals
    const weeklySales = await prisma.sale.findMany({
      where: { timestamp: { gte: BigInt(startOfWeek) } }
    });
    const monthlySales = await prisma.sale.findMany({
      where: { timestamp: { gte: BigInt(startOfMonth) } }
    });

    // 2. Employee Attendance (Today)
    const settings = await prisma.companySettings.findFirst();
    const workStartTime = settings?.workStartTime || "09:00";
    const [startH, startM] = workStartTime.split(':');
    const startH_num = Number(startH);
    const startM_num = Number(startM);
    const lateThreshold = now.startOf('day').add(startH_num, 'hour').add(startM_num, 'minute').valueOf();

    const todayAttendance = await prisma.attendance.findMany({
      where: { clockInTimestamp: { gte: BigInt(todayStart) } },
      include: { employee: true }
    });

    const totalEmployees = await prisma.employee.count({ where: { status: 'ACTIVE' } as any });
    const presentCount = todayAttendance.length;
    const lateCount = todayAttendance.filter(a => Number(a.clockInTimestamp) > lateThreshold).length;
    const absentCount = totalEmployees - presentCount;

    // 3. HR Stats
    const rolesCount = await prisma.role.findMany({
      include: { _count: { select: { employees: true } } }
    });
    
    const salaryExpenses = await prisma.employee.aggregate({
      _sum: { salary: true }
    });

    const newHires = await prisma.employee.count({
      where: { joinTimestamp: { gte: BigInt(startOfMonth) } }
    });

    // 4. Inventory Analytics
    const allProducts = await prisma.product.findMany();
    const lowStockThreshold = 10;
    const lowStock = allProducts.filter(p => p.stockLevel > 0 && p.stockLevel <= lowStockThreshold);
    const outOfStock = allProducts.filter(p => p.stockLevel === 0);
    
    // Best Sellers (Top 5)
    const saleItems = await prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    const bestSellers = await Promise.all(saleItems.map(async (item) => {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      return {
        name: product?.name || 'Unknown',
        quantity: item._sum.quantity
      };
    }));

    // 5. Peak Sales Heatmap (Daily distribution by hour)
    const allSales = await prisma.sale.findMany({
      where: { timestamp: { gte: BigInt(startOfMonth) } }
    });

    const peakHours = Array.from({ length: 24 }, (_, hour) => {
      const count = allSales.filter(s => dayjs(Number(s.timestamp)).hour() === hour).length;
      return { hour, count };
    });

    // 6. Sales Trends (Daily for selected range)
    const dailyTrend = await Promise.all(daysArray.map(async (date) => {
      const start = dayjs(date).startOf('day').valueOf();
      const end = dayjs(date).endOf('day').valueOf();
      const sales = await prisma.sale.findMany({
        where: { timestamp: { gte: BigInt(start), lte: BigInt(end) } }
      });
      const revenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      return { date: dayjs(date).format('MMM DD'), revenue };
    }));

    return serializeBigInt({
      revenue: {
        weekly: weeklySales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
        monthly: monthlySales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
        dailyTrend
      },
      hr: {
        totalEmployees,
        attendance: { present: presentCount, absent: absentCount, late: lateCount },
        distribution: rolesCount.map(r => ({ name: r.name, value: r._count.employees })),
        salaryExpenses: Number(salaryExpenses._sum.salary || 0),
        newHires
      },
      inventory: {
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        bestSellers,
        totalItems: allProducts.length
      },
      peakHours
    });
  }
}
