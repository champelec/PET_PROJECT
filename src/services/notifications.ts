import { notification } from 'antd';

// Единая точка входа для уведомлений об успехе/ошибке операций.
// Вынесено из stores, чтобы бизнес-логика не была завязана на конкретный UI-kit
// и чтобы уведомления были отдельной зоной ответственности (см. п.13 ТЗ).
export const notifySuccess = (message: string) => {
  notification.success({ message, placement: 'bottomRight' });
};

export const notifyError = (message: string) => {
  notification.error({ message, placement: 'bottomRight' });
};
