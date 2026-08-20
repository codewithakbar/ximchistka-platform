import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrderStatus } from '@prisma/client';
import { ORDER_STATUS_LABELS } from '@ximchistka/shared';
import { OrdersGateway } from './orders.gateway';

export type AdminRevenueEventType =
  | 'order_created'
  | 'order_received'
  | 'order_completed'
  | 'payment_received';

export type AdminRevenueNotification = {
  id: string;
  type: AdminRevenueEventType;
  title: string;
  message: string;
  amount: number;
  organizationId: string;
  branchId: string;
  branchName: string;
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  createdAt: string;
};

@Injectable()
export class AdminNotifyService {
  constructor(private gateway: OrdersGateway) {}

  notify(payload: Omit<AdminRevenueNotification, 'id' | 'createdAt' | 'statusLabel'> & {
    statusLabel?: string;
  }) {
    const notification: AdminRevenueNotification = {
      ...payload,
      id: randomUUID(),
      statusLabel:
        payload.statusLabel ??
        ORDER_STATUS_LABELS[payload.status as keyof typeof ORDER_STATUS_LABELS] ??
        payload.status,
      createdAt: new Date().toISOString(),
    };
    this.gateway.emitAdminRevenueNotification(payload.organizationId, notification);
  }

  orderCreated(order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: OrderStatus;
    branchId: string;
    branch: { name: string; organizationId: string };
  }) {
    this.notify({
      type: 'order_created',
      title: 'Yangi buyurtma (tushum)',
      message: `${order.branch.name}: ${order.orderNumber} qabul qilindi`,
      amount: order.totalAmount,
      organizationId: order.branch.organizationId,
      branchId: order.branchId,
      branchName: order.branch.name,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });
  }

  orderStatusChanged(order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: OrderStatus;
    branchId: string;
    branch: { name: string; organizationId: string };
  }) {
    if (order.status === OrderStatus.received_at_branch) {
      this.notify({
        type: 'order_received',
        title: 'Buyurtma filialda qabul qilindi',
        message: `${order.branch.name}: ${order.orderNumber} — ${ORDER_STATUS_LABELS.received_at_branch}`,
        amount: order.totalAmount,
        organizationId: order.branch.organizationId,
        branchId: order.branchId,
        branchName: order.branch.name,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      });
      return;
    }

    if (order.status === OrderStatus.completed) {
      this.notify({
        type: 'order_completed',
        title: 'Tushum yakunlandi',
        message: `${order.branch.name}: ${order.orderNumber} bajarildi`,
        amount: order.totalAmount,
        organizationId: order.branch.organizationId,
        branchId: order.branchId,
        branchName: order.branch.name,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      });
    }
  }

  paymentReceived(payment: {
    amount: number;
    order: {
      id: string;
      orderNumber: string;
      status: OrderStatus;
      branchId: string;
      branch: { name: string; organizationId: string };
    };
  }) {
    this.notify({
      type: 'payment_received',
      title: 'To\'lov qabul qilindi',
      message: `${payment.order.branch.name}: ${payment.order.orderNumber} — ${payment.amount.toLocaleString('uz-UZ')} so'm`,
      amount: payment.amount,
      organizationId: payment.order.branch.organizationId,
      branchId: payment.order.branchId,
      branchName: payment.order.branch.name,
      orderId: payment.order.id,
      orderNumber: payment.order.orderNumber,
      status: payment.order.status,
    });
  }
}
