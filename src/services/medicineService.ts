// src/services/medicineService.ts
// Dịch vụ tra cứu thuốc thông minh từ kho dữ liệu chi_thuoc.json
// Hoạt động 100% offline và hỗ trợ tìm kiếm không dấu siêu tốc

import type { CatalogMedicine } from '@/types';
import rawMedicinesData from '@/data/medicines.json';

const medicinesCatalog: CatalogMedicine[] = rawMedicinesData as CatalogMedicine[];

/**
 * Hàm bỏ dấu tiếng Việt để tìm kiếm không dấu (ví dụ: gõ "panadol" hay "pa na dol", "hoat huyet" đều tìm ra)
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
  str = str.replace(/\u02C6|\u0306|\u031B/g, '');
  return str.trim();
}

export interface SearchOptions {
  limit?: number;
  classification?: string; // 'Thuốc không kê đơn' | 'Thuốc kê đơn' | 'all'
}

/**
 * Tìm kiếm thuốc theo tên, công dụng, nhãn hiệu hoặc số đăng ký
 */
export function searchMedicines(query: string, options: SearchOptions = {}): CatalogMedicine[] {
  const { limit = 30, classification = 'all' } = options;
  const cleanQuery = removeVietnameseTones(query);

  if (!cleanQuery) {
    // Trả về danh sách thuốc gợi ý ban đầu
    return medicinesCatalog
      .filter((m) => classification === 'all' || m.classification === classification)
      .slice(0, limit);
  }

  const queryTerms = cleanQuery.split(' ').filter(Boolean);

  const results: CatalogMedicine[] = [];

  for (const med of medicinesCatalog) {
    if (classification !== 'all' && med.classification !== classification) {
      continue;
    }

    const normName = removeVietnameseTones(med.name || '');
    const normUsage = removeVietnameseTones(med.short_usage || '');
    const normBrand = removeVietnameseTones(med.brand || '');
    const fullSearchText = `${normName} ${normUsage} ${normBrand}`;

    // Kiểm tra tất cả các từ trong query có nằm trong thông tin thuốc không
    const matchesAll = queryTerms.every((term) => fullSearchText.includes(term));

    if (matchesAll) {
      results.push(med);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Lấy tổng số lượng thuốc trong kho
 */
export function getTotalMedicinesCount(): number {
  return medicinesCatalog.length;
}
