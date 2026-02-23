import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceLog {
  date: string;
  firstClockIn: string;
  lastClockOut: string | null;
  totalDuration: number;
  isActive: boolean;
  isLate: boolean;
  isOffDay: boolean;
  overtimeDuration: number;
}

interface ExportOptions {
  employeeName: string;
  companyName: string;
  startDate?: string;
  endDate?: string;
  timezone: string;
}

export const exportAttendanceToPDF = (logs: AttendanceLog[], options: ExportOptions) => {
  const { employeeName, companyName, startDate, endDate, timezone } = options;
  const doc = new jsPDF() as any;

  // Add Title
  doc.setFontSize(18);
  doc.text(`${companyName} - Attendance Sheet`, 14, 20);

  // Add Subtitle (Employee & Period)
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Employee: ${employeeName}`, 14, 30);
  
  let periodText = 'Period: All Time';
  if (startDate && endDate) {
    periodText = `Period: ${startDate} to ${endDate}`;
  } else if (startDate) {
    periodText = `Period: From ${startDate} onwards`;
  } else if (endDate) {
    periodText = `Period: Until ${endDate}`;
  }
  
  doc.text(periodText, 14, 37);
  doc.text(`Timezone: ${timezone}`, 14, 44);

  // Helper to format duration
  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // Helper to format timestamp
  const formatTime = (ts: string | null) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Prepare Table Data
  const tableRows = logs.map(log => [
    log.date,
    formatTime(log.firstClockIn),
    formatTime(log.lastClockOut),
    log.isOffDay ? 'Off Day' : (log.isLate ? 'Late' : 'On Time'),
    formatDuration(log.totalDuration),
    log.overtimeDuration > 0 ? formatDuration(log.overtimeDuration) : '-'
  ]);

  // Generate Table
  autoTable(doc, {
    startY: 55,
    head: [['Date', 'Clock In', 'Clock Out', 'Status', 'Work Hours', 'Overtime']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 55 },
  });

  // Footer with export date
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150);
    const footerText = `Exported on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`;
    doc.text(footerText, 14, doc.internal.pageSize.height - 10);
  }

  // Save the PDF
  const fileName = `Attendance_${employeeName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
  doc.save(fileName);
};
