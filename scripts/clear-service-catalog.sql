-- Seed va demo signup katalogini tozalash (production)
BEGIN;

DELETE FROM "PriceRule";

DELETE FROM "OrderItem"
WHERE "serviceId" IN (SELECT id FROM "Service");

DELETE FROM "Service";

DELETE FROM "ServiceCategory";

COMMIT;
