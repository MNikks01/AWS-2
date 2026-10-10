/*
  Warnings:

  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `totalAmount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - A unique constraint covering the columns `[customerId,idempotencyKey]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idempotencyKey` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestHash` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'COMMITTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "OrderFailureCode" AS ENUM ('INSUFFICIENT_STOCK', 'PROCESSING_ATTEMPTS_EXHAUSTED');

-- AlterTable
ALTER TABLE "Order"
    ADD COLUMN "completedAt" TIMESTAMPTZ(3),
    ADD COLUMN "currencyCode" CHAR(3) NOT NULL DEFAULT 'INR',
    ADD COLUMN "failureCode" "OrderFailureCode",
    ADD COLUMN "failureMessage" TEXT,
    ADD COLUMN "idempotencyKey" TEXT NOT NULL,
    ADD COLUMN "processingAttemptCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "processingLeaseExpiresAt" TIMESTAMPTZ(3),
    ADD COLUMN "requestHash" TEXT NOT NULL,
    ALTER COLUMN "status" TYPE "OrderStatus"
        USING ("status"::"OrderStatus"),
    ALTER COLUMN "status" SET DEFAULT 'PENDING',
    ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(12,2),
    ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
    ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentPrice" DECIMAL(12,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "productId" TEXT NOT NULL,
    "onHandQuantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_productId_key" ON "OrderItem"("orderId", "productId");

-- CreateIndex
CREATE INDEX "InventoryReservation_orderId_status_idx" ON "InventoryReservation"("orderId", "status");

-- CreateIndex
CREATE INDEX "InventoryReservation_productId_status_idx" ON "InventoryReservation"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservation_orderId_productId_key" ON "InventoryReservation"("orderId", "productId");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_processingLeaseExpiresAt_idx" ON "Order"("status", "processingLeaseExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_customerId_idempotencyKey_key" ON "Order"("customerId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_totalAmount_nonnegative_check"
        CHECK ("totalAmount" >= 0),
    ADD CONSTRAINT "Order_processingAttemptCount_nonnegative_check"
        CHECK ("processingAttemptCount" >= 0);

ALTER TABLE "Product"
    ADD CONSTRAINT "Product_currentPrice_nonnegative_check"
        CHECK ("currentPrice" >= 0);

ALTER TABLE "Inventory"
    ADD CONSTRAINT "Inventory_onHandQuantity_nonnegative_check"
        CHECK ("onHandQuantity" >= 0),
    ADD CONSTRAINT "Inventory_reservedQuantity_nonnegative_check"
        CHECK ("reservedQuantity" >= 0),
    ADD CONSTRAINT "Inventory_reserved_not_above_onHand_check"
        CHECK ("reservedQuantity" <= "onHandQuantity");

ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_quantity_positive_check"
        CHECK ("quantity" > 0),
    ADD CONSTRAINT "OrderItem_unitPrice_nonnegative_check"
        CHECK ("unitPrice" >= 0);

ALTER TABLE "InventoryReservation"
    ADD CONSTRAINT "InventoryReservation_quantity_positive_check"
        CHECK ("quantity" > 0);