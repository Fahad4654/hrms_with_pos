import prisma from '../config/prisma.js';

export class BIService {
  static async calculateCommissions(employeeId: string, startDate: Date, endDate: Date, commissionRate: number = 0.05) {
    const sales = await prisma.sale.findMany({
      where: {
        employeeId,
        timestamp: {
          gte: startDate,
          lte: endDate,
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
      const duration = (log.clockOutTimestamp!.getTime() - log.clockInTimestamp.getTime()) / (1000 * 60 * 60);
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

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    // 1. Base Pay
    const basePay = Number(employee.salary);

    // 2. Commissions (assume 5% for now)
    const commissions = await this.calculateCommissions(employeeId, startDate, endDate);

    // 3. Deductions for Unpaid Leaves
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        startTimestamp: { gte: startDate },
        endTimestamp: { lte: endDate },
        type: 'UNPAID',
      },
    });
    const unpaidDays = leaves.reduce((sum, leave) => {
      const days = (leave.endTimestamp.getTime() - leave.startTimestamp.getTime()) / (1000 * 60 * 60 * 24) + 1;
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
}
