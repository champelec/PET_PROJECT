import { notification } from 'antd';


export const notifySuccess = (message: string) => {
  notification.success({ message, placement: 'bottomRight' });
};

export const notifyError = (message: string) => {
  notification.error({ message, placement: 'bottomRight' });
};
