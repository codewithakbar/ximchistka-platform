import bcrypt from 'bcryptjs';
import {
  DeliveryType,
  OrganizationPlan,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  prisma,
  UserRole,
} from '../src/index';

async function main() {
  const platformAdmin = await prisma.user.upsert({
    where: { phone: '+998900000001' },
    update: {},
    create: {
      phone: '+998900000001',
      email: 'platform@ximchistka.uz',
      fullName: 'Platform Admin',
      role: UserRole.platform_admin,
      passwordHash: await bcrypt.hash('admin123', 10),
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'ximchistka-demo' },
    update: {
      plan: OrganizationPlan.active,
      isActive: true,
    },
    create: {
      name: 'Ximchistka Demo',
      slug: 'ximchistka-demo',
      plan: OrganizationPlan.active,
      isActive: true,
    },
  });

  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { id: 'seed-branch-chilonzor' },
      update: {},
      create: {
        id: 'seed-branch-chilonzor',
        organizationId: org.id,
        name: 'Chilonzor filiali',
        address: "Toshkent, Chilonzor 9-kvartal",
        phone: '+998901234567',
        latitude: 41.2856,
        longitude: 69.2034,
      },
    }),
    prisma.branch.upsert({
      where: { id: 'seed-branch-yunusabad' },
      update: {},
      create: {
        id: 'seed-branch-yunusabad',
        organizationId: org.id,
        name: 'Yunusobod filiali',
        address: "Toshkent, Yunusobod 4-kvartal",
        phone: '+998901234568',
        latitude: 41.3675,
        longitude: 69.2874,
      },
    }),
  ]);

  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { phone: '+998901111111' },
    update: {},
    create: {
      organizationId: org.id,
      phone: '+998901111111',
      email: 'admin@ximchistka.uz',
      fullName: 'Super Admin',
      role: UserRole.super_admin,
      passwordHash,
    },
  });

  const operator = await prisma.user.upsert({
    where: { phone: '+998902222222' },
    update: {},
    create: {
      organizationId: org.id,
      phone: '+998902222222',
      email: 'operator@ximchistka.uz',
      fullName: 'Filial Operator',
      role: UserRole.operator,
      passwordHash,
    },
  });

  const courier = await prisma.user.upsert({
    where: { phone: '+998903333333' },
    update: {},
    create: {
      organizationId: org.id,
      phone: '+998903333333',
      email: 'courier@ximchistka.uz',
      fullName: 'Kuryer Ali',
      role: UserRole.courier,
      passwordHash,
    },
  });

  const branchManager = await prisma.user.upsert({
    where: { phone: '+998905555555' },
    update: {},
    create: {
      organizationId: org.id,
      phone: '+998905555555',
      email: 'manager@ximchistka.uz',
      fullName: 'Filial Menejeri',
      role: UserRole.branch_manager,
      passwordHash,
    },
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: operator.id, branchId: branches[0].id } },
    update: {},
    create: { userId: operator.id, branchId: branches[0].id },
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: courier.id, branchId: branches[0].id } },
    update: {},
    create: { userId: courier.id, branchId: branches[0].id },
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: branchManager.id, branchId: branches[0].id } },
    update: {},
    create: { userId: branchManager.id, branchId: branches[0].id },
  });

  const category = await prisma.serviceCategory.upsert({
    where: { id: 'seed-category-dry' },
    update: {},
    create: {
      id: 'seed-category-dry',
      name: 'Kimyo tozalash',
      description: 'Professional ximchistka xizmatlari',
      sortOrder: 1,
    },
  });

  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 'seed-service-koylak' },
      update: {},
      create: {
        id: 'seed-service-koylak',
        categoryId: category.id,
        name: "Ko'ylak tozalash",
        basePrice: 25000,
      },
    }),
    prisma.service.upsert({
      where: { id: 'seed-service-palto' },
      update: {},
      create: {
        id: 'seed-service-palto',
        categoryId: category.id,
        name: 'Palto tozalash',
        basePrice: 80000,
      },
    }),
    prisma.service.upsert({
      where: { id: 'seed-service-press' },
      update: {},
      create: {
        id: 'seed-service-press',
        categoryId: category.id,
        name: 'Press (dazmol)',
        basePrice: 15000,
      },
    }),
  ]);

  for (const branch of branches) {
    for (const service of services) {
      await prisma.priceRule.upsert({
        where: {
          branchId_serviceId_itemType: {
            branchId: branch.id,
            serviceId: service.id,
            itemType: 'standart',
          },
        },
        update: {},
        create: {
          branchId: branch.id,
          serviceId: service.id,
          itemType: 'standart',
          price: service.basePrice,
        },
      });
    }
  }

  const customerUser = await prisma.user.upsert({
    where: { phone: '+998904444444' },
    update: {},
    create: {
      phone: '+998904444444',
      fullName: 'Mijoz Sardor',
      role: UserRole.customer,
    },
  });

  const customerProfile = await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: { userId: customerUser.id },
  });

  await prisma.customerAddress.upsert({
    where: { id: 'seed-address-1' },
    update: {},
    create: {
      id: 'seed-address-1',
      profileId: customerProfile.id,
      label: 'Uy',
      address: "Toshkent, Chilonzor 5-kvartal, 12-uy",
      isDefault: true,
    },
  });

  await prisma.promoCode.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      discountType: 'percent',
      discountValue: 10,
      maxUses: 1000,
    },
  });

  const order = await prisma.order.upsert({
    where: { orderNumber: 'XC-10001' },
    update: {},
    create: {
      orderNumber: 'XC-10001',
      branchId: branches[0].id,
      customerId: customerProfile.id,
      status: OrderStatus.in_processing,
      totalAmount: 105000,
      notes: 'Ehtiyotkorlik bilan',
      items: {
        create: [
          {
            serviceId: services[0].id,
            quantity: 2,
            unitPrice: 25000,
          },
          {
            serviceId: services[1].id,
            quantity: 1,
            unitPrice: 80000,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.submitted },
          { status: OrderStatus.received_at_branch, changedBy: operator.id },
          { status: OrderStatus.in_processing, changedBy: operator.id },
        ],
      },
      pickupDelivery: {
        create: {
          type: DeliveryType.pickup,
          scheduledAt: new Date(Date.now() + 86400000),
          address: "Toshkent, Chilonzor 5-kvartal, 12-uy",
        },
      },
    },
  });

  await prisma.payment.upsert({
    where: { id: 'seed-payment-1' },
    update: {},
    create: {
      id: 'seed-payment-1',
      orderId: order.id,
      provider: PaymentProvider.cash,
      amount: order.totalAmount,
      status: PaymentStatus.pending,
    },
  });

  console.log('Seed completed:', {
    platformAdminPhone: platformAdmin.phone,
    platformAdminPassword: 'admin123',
    merchantUrl: 'http://localhost:3003',
    org: org.slug,
    adminPhone: admin.phone,
    adminPassword: 'admin123',
    customerPhone: customerUser.phone,
    orderNumber: order.orderNumber,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
