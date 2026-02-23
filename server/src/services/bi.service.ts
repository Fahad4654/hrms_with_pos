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
}
