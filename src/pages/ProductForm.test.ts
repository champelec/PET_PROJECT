import { describe, it, expect } from 'vitest';
import { productSchema } from './ProductForm';

describe('Валидация формы товара (Zod)', () => {
  it('должна успешно пропускать валидные данные', () => {
    const validData = {
      title: 'Новый ноутбук',
      description: 'Отличное устройство с мощным процессором, идеально для работы.',
      category: 'laptops',
      price: 1500.50,
      stock: 12,
      thumbnail: 'https://example.com/macbook.png'
    };
    
    const result = productSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('должна выдавать ошибки при некорректных данных (цена < 0, короткое название)', () => {
    const invalidData = {
      title: 'АБ',
      description: 'Мало', 
      category: 'laptops',
      price: -10,
      stock: -5, 
      thumbnail: 'not-a-url'
    };
    
    const result = productSchema.safeParse(invalidData);
    
    expect(result.success).toBe(false);
    
    if (!result.success) {
      const errors = result.error.format();
      expect(errors.title?._errors).toContain('Минимум 3 символа');
      expect(errors.description?._errors).toContain('Минимум 10 символов');
      expect(errors.price?._errors).toContain('Больше 0');
      expect(errors.stock?._errors).toContain('Не меньше 0');
      expect(errors.thumbnail?._errors).toContain('Некорректный URL');
    }
  });
});
