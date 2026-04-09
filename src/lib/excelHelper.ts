import * as XLSX from 'xlsx';
import { Transaction } from '../types';
import dayjs from 'dayjs';

export const exportTransactionsToExcel = (transactions: Transaction[], monthStr: string) => {
  // Filter transactions for the selected month or export all if monthStr is empty
  const formattedData = transactions.map(t => ({
    'Mã Giao Dịch': t.id,
    'Ngày Ghi Nhận': dayjs(t.date).format('DD/MM/YYYY'),
    'Loại': t.type === 'income' ? 'Khoản Thu' : 'Khoản Chi',
    'Danh Mục': t.category,
    'Số Tiền (VNĐ)': t.amount,
    'Ghi Chú': t.description || 'Không có',
    'Tham Chiếu': t.relatedId || 'Không có',
    'Người Tạo': t.createdBy || 'Hệ thống'
  }));

  // Create a new workbook and add the worksheet
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  
  // Style the header row (basic formatting applied automatically by json_to_sheet)
  // Optional: Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Mã GD
    { wch: 15 }, // Ngày
    { wch: 12 }, // Loại
    { wch: 25 }, // Danh mục
    { wch: 15 }, // Số tiền
    { wch: 30 }, // Ghi chú
    { wch: 20 }, // Tham chiếu
    { wch: 15 }, // Người tạo
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, `Báo Cáo ${monthStr || 'Tất Cả'}`);

  // Export the file using writeFile
  XLSX.writeFile(workbook, `Bao_Cao_Tai_Chinh_${monthStr ? monthStr.replace('/', '_') : 'Tong_Hop'}.xlsx`);
};
